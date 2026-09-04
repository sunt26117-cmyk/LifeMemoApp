// lib/growth/growth_engine.dart
//
// 成长趋势打分引擎（对应 §13-§20 + §42 测试矩阵 + §43 验收标准）。
// 纯逻辑、无 Flutter/IO 依赖，方便单测和被 Provider/Service 复用。

/// 任务难度，只影响正向奖励的放大倍率。
enum TaskDifficulty { easy, normal, hard }

extension TaskDifficultyRewardMultiplier on TaskDifficulty {
  /// 难度对正向奖励的放大倍率。真正的"防止随意调难度刷分"的校正逻辑
  /// 应该由上层根据历史完成率去校正后再传入 computeNext 的
  /// difficultyMultiplier 参数，本引擎不做校正、只应用倍率。
  double get baseRewardMultiplier {
    switch (this) {
      case TaskDifficulty.easy:
        return 0.8;
      case TaskDifficulty.normal:
        return 1.0;
      case TaskDifficulty.hard:
        return 1.3;
    }
  }
}

enum GrowthDirection { up, down, flat }

/// 全部可调参数集中在这里，禁止把魔法数字散落到计算逻辑里。
/// 默认值已经过数值验证，符合 §42 测试矩阵的全部方向性要求。
class GrowthAlgorithmConfig {
  final double stabilityLine; // 70% 个人稳定线
  final double sustainCoefficient; // 维持力系数
  final double momentumCoefficient; // 上升动量系数
  final double declineCoefficient; // 下降动量系数
  final double recoveryBonusPerStreak; // 连续上升的恢复加成（每层）
  final int maxRecoveryStreak; // 恢复加成封顶层数
  final double declineEscalationStep; // 连续下降的惩罚递增步长（每层）
  final int maxDeclineEscalationStreak; // 惩罚递增封顶层数
  final double perfectCompletionBonus; // 首次摸到 100% 的一次性奖励
  final double perfectStreakDecayFactor; // 连续 100% 时维持力的每期衰减系数
  final double perfectStreakDecayFloor; // 衰减下限（不会衰减到 0）
  final double minRewardFactorBelowLine; // 稳定线以下，上升奖励折扣的下限
  final double maxSingleStepDelta; // 单期 delta 上限
  final double minSingleStepDelta; // 单期 delta 下限（防止一次跌穿底部）
  final double scoreMin;
  final double scoreMax;

  const GrowthAlgorithmConfig({
    this.stabilityLine = 0.7,
    this.sustainCoefficient = 20,
    this.momentumCoefficient = 50,
    this.declineCoefficient = 25,
    this.recoveryBonusPerStreak = 2,
    this.maxRecoveryStreak = 5,
    this.declineEscalationStep = 0.5,
    this.maxDeclineEscalationStreak = 5,
    this.perfectCompletionBonus = 5,
    this.perfectStreakDecayFactor = 0.75,
    this.perfectStreakDecayFloor = 0.3,
    this.minRewardFactorBelowLine = 0.3,
    this.maxSingleStepDelta = 40,
    this.minSingleStepDelta = -30,
    this.scoreMin = -100,
    this.scoreMax = 100,
  });
}

/// 某个打卡类型/周期任务的成长状态快照，需要按周期持久化
/// （建议：每个 CheckInType 或每个周期任务维护一份独立的 GrowthState，
/// 存进 Supabase 或本地 db，字段直接对应下面几个属性）。
class GrowthState {
  final double score; // 当前累计 GrowthScore，范围 [-100, 100]
  final double? lastCompletionRate; // 上一周期完成率（0..1），首次为 null
  final int consecutiveImproveStreak; // 连续上升期数（不含本期）
  final int consecutiveDeclineStreak; // 连续下降期数（不含本期）
  final int consecutivePerfectStreak; // 连续 100% 完成期数（不含本期）

  const GrowthState({
    required this.score,
    required this.lastCompletionRate,
    this.consecutiveImproveStreak = 0,
    this.consecutiveDeclineStreak = 0,
    this.consecutivePerfectStreak = 0,
  });

  factory GrowthState.initial() =>
      const GrowthState(score: 0, lastCompletionRate: null);

  GrowthState copyWith({
    double? score,
    double? lastCompletionRate,
    int? consecutiveImproveStreak,
    int? consecutiveDeclineStreak,
    int? consecutivePerfectStreak,
  }) {
    return GrowthState(
      score: score ?? this.score,
      lastCompletionRate: lastCompletionRate ?? this.lastCompletionRate,
      consecutiveImproveStreak:
          consecutiveImproveStreak ?? this.consecutiveImproveStreak,
      consecutiveDeclineStreak:
          consecutiveDeclineStreak ?? this.consecutiveDeclineStreak,
      consecutivePerfectStreak:
          consecutivePerfectStreak ?? this.consecutivePerfectStreak,
    );
  }
}

class GrowthUpdateResult {
  final GrowthState newState;
  final double delta;
  final GrowthDirection direction;

  const GrowthUpdateResult({
    required this.newState,
    required this.delta,
    required this.direction,
  });
}

class GrowthEngine {
  final GrowthAlgorithmConfig config;

  const GrowthEngine([this.config = const GrowthAlgorithmConfig()]);

  /// 用一个周期的完成率推进一次成长状态。
  /// [completionRate] 必须是 0..1（即 0%~100%）。
  /// [difficultyMultiplier] 由上层传入"校正后"的难度倍率；不传则按 1.0（normal）处理。
  GrowthUpdateResult computeNext({
    required GrowthState previousState,
    required double completionRate,
    double? difficultyMultiplier,
  }) {
    assert(completionRate >= 0 && completionRate <= 1,
        '完成率必须在 0..1 之间，收到: $completionRate');

    final r = completionRate;
    final prevR = previousState.lastCompletionRate;
    final effectiveMultiplier =
        difficultyMultiplier ?? TaskDifficulty.normal.baseRewardMultiplier;

    // 第一期没有上一周期数据：只应用维持力，不产生动量分量。
    if (prevR == null) {
      final sustain = _sustainDelta(r, previousState.consecutivePerfectStreak);
      final delta = _clampDelta(sustain);
      final newScore = _clampScore(previousState.score + delta);
      return GrowthUpdateResult(
        newState: previousState.copyWith(
          score: newScore,
          lastCompletionRate: r,
          consecutiveImproveStreak: 0,
          consecutiveDeclineStreak: 0,
          consecutivePerfectStreak: r >= 1.0 ? 1 : 0,
        ),
        delta: delta,
        direction: GrowthDirection.flat,
      );
    }

    double momentum;
    GrowthDirection direction;
    int newImproveStreak;
    int newDeclineStreak;

    if (r > prevR) {
      direction = GrowthDirection.up;
      newImproveStreak = previousState.consecutiveImproveStreak + 1;
      newDeclineStreak = 0;

      final rewardFactor = _rewardFactor(r);
      final recoveryBonus = config.recoveryBonusPerStreak *
          _capStreak(newImproveStreak, config.maxRecoveryStreak);
      momentum = config.momentumCoefficient * (r - prevR) * rewardFactor +
          recoveryBonus;

      // 首次摸到 100% 的一次性奖励（对应情况 E："90 → 100 明显上升"）。
      if (r >= 1.0 && prevR < 1.0) {
        momentum += config.perfectCompletionBonus;
      }
    } else if (r < prevR) {
      direction = GrowthDirection.down;
      newDeclineStreak = previousState.consecutiveDeclineStreak + 1;
      newImproveStreak = 0;

      final escalation = 1 +
          config.declineEscalationStep *
              (_capStreak(newDeclineStreak, config.maxDeclineEscalationStreak) -
                  1);
      momentum = -config.declineCoefficient * (prevR - r) * escalation;
    } else {
      direction = GrowthDirection.flat;
      newImproveStreak = 0;
      newDeclineStreak = 0;
      momentum = 0;
    }

    final sustain = _sustainDelta(r, previousState.consecutivePerfectStreak);
    var rawDelta = sustain + momentum;

    // 难度只放大正向奖励，不放大惩罚。
    if (rawDelta > 0) {
      rawDelta *= effectiveMultiplier;
    }

    final delta = _clampDelta(rawDelta);
    final newScore = _clampScore(previousState.score + delta);
    final newPerfectStreak =
        r >= 1.0 ? previousState.consecutivePerfectStreak + 1 : 0;

    return GrowthUpdateResult(
      newState: previousState.copyWith(
        score: newScore,
        lastCompletionRate: r,
        consecutiveImproveStreak: newImproveStreak,
        consecutiveDeclineStreak: newDeclineStreak,
        consecutivePerfectStreak: newPerfectStreak,
      ),
      delta: delta,
      direction: direction,
    );
  }

  /// 依次推进一整段周期完成率序列，直接喂给周/月/年成长曲线渲染（TASK-EXT-06 会用到）。
  List<GrowthUpdateResult> computeSeries({
    required GrowthState initialState,
    required List<double> completionRates,
    List<double?>? difficultyMultipliers,
  }) {
    final results = <GrowthUpdateResult>[];
    var state = initialState;
    for (var i = 0; i < completionRates.length; i++) {
      final result = computeNext(
        previousState: state,
        completionRate: completionRates[i],
        difficultyMultiplier:
            difficultyMultipliers != null && i < difficultyMultipliers.length
                ? difficultyMultipliers[i]
                : null,
      );
      results.add(result);
      state = result.newState;
    }
    return results;
  }

  double _sustainDelta(double r, int perfectStreakBefore) {
    final base = config.sustainCoefficient * (r - config.stabilityLine);
    if (r >= 1.0 && perfectStreakBefore > 0) {
      final decay = _decayPow(
        config.perfectStreakDecayFactor,
        perfectStreakBefore,
        config.perfectStreakDecayFloor,
      );
      return base * decay;
    }
    return base;
  }

  double _rewardFactor(double r) {
    if (r >= config.stabilityLine) return 1.0;
    final ratio = r / config.stabilityLine;
    return ratio < config.minRewardFactorBelowLine
        ? config.minRewardFactorBelowLine
        : ratio;
  }

  int _capStreak(int streak, int max) => streak > max ? max : streak;

  double _decayPow(double base, int exponent, double floor) {
    var v = 1.0;
    for (var i = 0; i < exponent; i++) {
      v *= base;
    }
    return v < floor ? floor : v;
  }

  double _clampDelta(double delta) {
    if (delta > config.maxSingleStepDelta) return config.maxSingleStepDelta;
    if (delta < config.minSingleStepDelta) return config.minSingleStepDelta;
    return delta;
  }

  double _clampScore(double score) {
    if (score > config.scoreMax) return config.scoreMax;
    if (score < config.scoreMin) return config.scoreMin;
    return score;
  }
}
