# 成长曲线评审派单 · 文件 1/2：当前源码

> 成长曲线模块全部相关文件的当前真实完整源码。
> 评审要求见「文件 2」。请基于这些源码评审，禁止臆造未提供的代码。

```dart
// ===== FILE: lib/screens/growth/growth_curve_screen.dart =====
// lib/screens/growth/growth_curve_screen.dart
//
// 成长曲线页面：周/月/年三档平滑曲线 + AI 自然语言分析。
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';

import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/growth_ai.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/growth/growth_engine.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/services/growth_history_service.dart';
import 'package:ai_life_recorder/utils/growth_aggregation.dart';

class GrowthCurveScreen extends StatefulWidget {
  /// 真实成长序列（由后续任务按期计算后注入）。为空/未传时页面显示空态引导，
  /// 不展示任何模拟数据。
  final List<GrowthUpdateResult>? series;
  const GrowthCurveScreen({super.key, this.series});

  @override
  State<GrowthCurveScreen> createState() => _GrowthCurveScreenState();
}

class _GrowthCurveScreenState extends State<GrowthCurveScreen> {
  AggregationView _view = AggregationView.week;
  bool _analyzing = false;
  String? _analysis;
  bool _loading = true;
  List<GrowthUpdateResult> _loadedSeries = const <GrowthUpdateResult>[];

  /// 数据源：优先用外部注入；否则从打卡记录仓库实时计算（真实数据链路）。
  List<GrowthUpdateResult> get _series => widget.series ?? _loadedSeries;

  bool get _hasData => _series.isNotEmpty;

  @override
  void initState() {
    super.initState();
    if (widget.series == null) {
      _loadFromRepository();
    } else {
      _loading = false;
    }
  }

  Future<void> _loadFromRepository() async {
    try {
      final repos = context.read<Repositories>();
      final service =
          GrowthHistoryService(recordRepository: repos.checkInRecords);
      final series = await service.loadGrowthSeries();
      if (!mounted) return;
      setState(() {
        _loadedSeries = series;
        _loading = false;
      });
    } catch (e) {
      debugPrint('GrowthCurveScreen load failed: $e');
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _onAnalyze() async {
    if (!_hasData) return;
    final points = aggregateGrowthSeries(_series, _view);
    final scores = points.map((p) => p.score).toList();
    final labels = points.map((p) => p.label).toList();

    setState(() {
      _analyzing = true;
      _analysis = null;
    });

    try {
      final growthAi = context.read<GrowthAi>();
      final res = await growthAi.generateGrowthAnalysis(
        scores: scores,
        labels: labels,
      );
      if (mounted) {
        setState(() {
          _analysis = res['analysis'] as String?;
        });
      }
    } on AiException {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('摘要生成失败，点击重试')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _analyzing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final points = aggregateGrowthSeries(_series, _view);

    return Scaffold(
      appBar: AppBar(title: const Text('成长曲线')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildSegmentedControl(),
              const SizedBox(height: 16),
              Expanded(
                child: Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: _loading
                        ? const Center(
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : points.isEmpty
                            ? const _EmptyGrowthHint()
                            : LineChart(_buildLineChartData(points)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed:
                      (_analyzing || _loading || !_hasData) ? null : _onAnalyze,
                  child: _analyzing
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('AI 分析'),
                ),
              ),
              if (_analysis != null) ...[
                const SizedBox(height: 12),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      _analysis!,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.5,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSegmentedControl() {
    return SegmentedButton<AggregationView>(
      segments: const [
        ButtonSegment(
          value: AggregationView.week,
          label: Text('周'),
        ),
        ButtonSegment(
          value: AggregationView.month,
          label: Text('月'),
        ),
        ButtonSegment(
          value: AggregationView.year,
          label: Text('年'),
        ),
      ],
      selected: <AggregationView>{_view},
      onSelectionChanged: (selected) {
        if (selected.isNotEmpty) {
          setState(() => _view = selected.first);
        }
      },
    );
  }

  LineChartData _buildLineChartData(List<GrowthDataPoint> points) {
    final spots = [
      for (var i = 0; i < points.length; i++)
        FlSpot(i.toDouble(), points[i].score),
    ];

    final minScore = points.map((p) => p.score).reduce((a, b) => a < b ? a : b);
    final maxScore = points.map((p) => p.score).reduce((a, b) => a > b ? a : b);
    final padding = ((maxScore - minScore).abs() * 0.1).clamp(5.0, 20.0);

    return LineChartData(
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        horizontalInterval: _niceInterval(minScore, maxScore),
      ),
      titlesData: FlTitlesData(
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            interval: 1,
            getTitlesWidget: (value, meta) {
              final index = value.toInt();
              if (index < 0 || index >= points.length) return const SizedBox();
              return Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  points[index].label,
                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                ),
              );
            },
            reservedSize: 30,
          ),
        ),
        leftTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 40,
            getTitlesWidget: (value, meta) => Text(
              value.toInt().toString(),
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ),
        ),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles:
            const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      borderData: FlBorderData(show: false),
      minX: 0,
      maxX: (points.length - 1).toDouble(),
      minY: minScore - padding,
      maxY: maxScore + padding,
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          isCurved: true,
          color: AppColors.primary,
          barWidth: 3,
          dotData: FlDotData(
            show: true,
            getDotPainter: (spot, percent, bar, index) => FlDotCirclePainter(
              radius: 4,
              color: AppColors.primary,
              strokeWidth: 2,
              strokeColor: Colors.white,
            ),
          ),
          belowBarData: BarAreaData(show: false),
        ),
      ],
    );
  }

  double _niceInterval(double min, double max) {
    final range = (max - min).abs();
    if (range <= 0) return 10;
    return (range / 4).clamp(5.0, 50.0);
  }
}

/// 空态引导：还没有任何真实成长数据时展示（绝不显示模拟数据）。
class _EmptyGrowthHint extends StatelessWidget {
  const _EmptyGrowthHint();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.insights_rounded, size: 44, color: AppColors.mutedIcon),
            SizedBox(height: 12),
            Text('还没有成长数据',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
            SizedBox(height: 6),
            Text('坚持打卡、完成任务后，这里会按周/月/年显示你的成长曲线。',
                textAlign: TextAlign.center,
                style:
                    TextStyle(fontSize: 12, color: Colors.grey, height: 1.5)),
          ],
        ),
      ),
    );
  }
}

```

```dart
// ===== FILE: lib/services/growth_history_service.dart =====
// lib/services/growth_history_service.dart
//
// 成长历史服务：从打卡记录仓库读取真实记录 → 按周统计完成率 → 多类型合并 →
// 得到可直接注入 GrowthCurveScreen 的 GrowthUpdateResult 序列。
// 纯打卡用户从第一周开始即可看到真实成长曲线（无数据时页面自然空态）。
import 'package:ai_life_recorder/growth/growth_engine.dart';
import 'package:ai_life_recorder/growth/multi_type_growth_combiner.dart';
import 'package:ai_life_recorder/growth/weekly_completion_builder.dart';
import 'package:ai_life_recorder/repositories/check_in_record_repository.dart';

class GrowthHistoryService {
  final CheckInRecordRepository recordRepository;
  final MultiTypeGrowthCombiner combiner;
  GrowthHistoryService({
    required this.recordRepository,
    MultiTypeGrowthCombiner? combiner,
  }) : combiner = combiner ?? const MultiTypeGrowthCombiner();

  /// 读取全部打卡记录（按时间倒序无所谓，builder 内部会排序），生成成长序列。
  Future<List<GrowthUpdateResult>> loadGrowthSeries() async {
    final records = await recordRepository.listByRange(
      DateTime(2000, 1, 1),
      DateTime.now().toUtc().add(const Duration(days: 1)),
    );
    if (records.isEmpty) return <GrowthUpdateResult>[];

    // CheckInRecord.date 是本地日历日；转成 builder 输入
    final entries = records.map((r) {
      return CheckInDayEntry(typeId: r.typeId, date: r.date);
    }).toList();

    final snapshots = buildWeeklySnapshots(entries);
    final points = combiner.combine(snapshots);
    return points.map((p) => p.update).toList();
  }
}

```

```dart
// ===== FILE: lib/growth/growth_engine.dart =====
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

```

```dart
// ===== FILE: lib/growth/multi_type_growth_combiner.dart =====
// lib/growth/multi_type_growth_combiner.dart
//
// 场景：用户同时追踪多个打卡类型（有时 3 个在跑，有时只有 1-2 个）。
// 这个文件把"每个统计周期内所有【当时处于活跃状态】的打卡类型的完成率"
// 合并成一条统一的完成率序列，再喂给 GrowthEngine 生成"整体成长曲线"。
//
// 设计原则：
// 1. 每个周期只统计在那个周期内"活跃"（已创建且未停用）的打卡类型，
//    用它们的完成率取算术平均；同一时刻有几个活跃类型，分母就是几。
// 2. 一个周期如果连一个活跃类型都没有，这个周期视为"无数据"，直接跳过、
//    不参与 GrowthEngine 计算——不会拿 0 去填充制造虚假暴跌。
// 3. 新增的打卡类型：在它被创建之前的周期里不算"活跃"，不拖累已算分数。
// 4. 停用的打卡类型：停用之后的周期不再计入平均，但停用之前的历史数据不删除。
//
// 本文件只负责"把多类型压成一条曲线"，不负责从 CheckInRecord 统计每周完成率
// ——那一步由调用方完成，构造出 PeriodActivitySnapshot 列表后传进来。
import 'growth_engine.dart';

/// 一个打卡类型在某个统计周期内的完成率输入。
class TypePeriodCompletion {
  final String typeId;
  final double completionRate; // 0..1，该类型在这个周期的完成率
  final double? difficultyMultiplier; // 不传则按 1.0(normal)

  const TypePeriodCompletion({
    required this.typeId,
    required this.completionRate,
    this.difficultyMultiplier,
  });
}

/// 一个统计周期（比如"第N周"）里，所有当时活跃的打卡类型的完成率快照。
/// 只放"活跃"的类型——已停用、或这个周期还没创建的类型不要放进来。
class PeriodActivitySnapshot {
  final List<TypePeriodCompletion> activeTypes;
  const PeriodActivitySnapshot(this.activeTypes);

  bool get hasData => activeTypes.isNotEmpty;

  /// 合并完成率：多个活跃类型的完成率取算术平均（保持 0..1）。
  double get combinedCompletionRate {
    if (activeTypes.isEmpty) return 0;
    final sum = activeTypes.fold<double>(0, (s, t) => s + t.completionRate);
    return sum / activeTypes.length;
  }

  /// 合并难度倍率：活跃类型难度倍率的平均（未指定的按 1.0 计）。
  double get combinedDifficultyMultiplier {
    if (activeTypes.isEmpty) return 1.0;
    final sum = activeTypes.fold<double>(
        0, (s, t) => s + (t.difficultyMultiplier ?? 1.0));
    return sum / activeTypes.length;
  }
}

/// combine() 的单个输出点。比 GrowthUpdateResult 多带：
/// - periodIndex：对齐调用方原始输入列表的下标（无数据周期被跳过，输出长度可能小于输入）；
/// - activeTypeCount：该周期同时活跃的打卡类型数量（UI 可选用于标注）。
class CombinedGrowthPoint {
  final int periodIndex;
  final int activeTypeCount;
  final GrowthUpdateResult update;

  const CombinedGrowthPoint({
    required this.periodIndex,
    required this.activeTypeCount,
    required this.update,
  });
}

class MultiTypeGrowthCombiner {
  final GrowthEngine engine;
  const MultiTypeGrowthCombiner([this.engine = const GrowthEngine()]);

  /// 输入：按时间顺序排列的周期快照（最近 N 周，每周一个）。
  /// 输出：跳过 hasData=false 的周期后，依次推进 GrowthEngine 的结果列表。
  /// 无数据周期不会被算成"没有进步/退步"——state 直接跳过该周期，未被更新。
  List<CombinedGrowthPoint> combine(List<PeriodActivitySnapshot> periods) {
    final results = <CombinedGrowthPoint>[];
    var state = GrowthState.initial();

    for (var i = 0; i < periods.length; i++) {
      final snapshot = periods[i];
      if (!snapshot.hasData) continue;

      final update = engine.computeNext(
        previousState: state,
        completionRate: snapshot.combinedCompletionRate,
        difficultyMultiplier: snapshot.combinedDifficultyMultiplier,
      );
      state = update.newState;
      results.add(CombinedGrowthPoint(
        periodIndex: i,
        activeTypeCount: snapshot.activeTypes.length,
        update: update,
      ));
    }
    return results;
  }
}

```

```dart
// ===== FILE: lib/growth/weekly_completion_builder.dart =====
// lib/growth/weekly_completion_builder.dart
//
// 真实数据统计层核心（纯逻辑，可单测）：把 CheckInRecord 打卡记录按周切分，
// 产出 MultiTypeGrowthCombiner 需要的 PeriodActivitySnapshot 列表。
//
// 「每周完成率」口径（2026-09-04 用户确认，选型理由见 TASKS-LOG）：
// - 某类型"在追踪中"(活跃) = 截至该周末，历史上至少打过一次的类型
//   （用户主动启用的习惯；不惩罚刚开始——第 1 周打过的类型当周即算活跃并完成）。
// - 某类型本周完成率 = 本周打过 ? 1.0 : 0.0（打了就算坚持，不因频次低被罚）。
// - 每周整体完成率 = 本周完成类型数 ÷ 截至该周末活跃类型数（combiner 内取平均）。
//
// 已知限制：CheckInType 无"停用时间"历史字段，无法精确还原某周某类型是否已停用；
// 本实现以"曾打过"近似活跃集。若要精确支持停用，需给类型加停用时间戳（后续扩展）。
import 'multi_type_growth_combiner.dart';

/// 打卡记录的最小输入视图（避免本层依赖 repository/模型，便于单测）。
class CheckInDayEntry {
  final String typeId;
  final DateTime date; // 打卡的本地日历日（仅日期部分有意义）
  const CheckInDayEntry({required this.typeId, required this.date});
}

/// 把某天归到它所在的周（周一为一周起点）。返回该周周一的 00:00 本地时间。
DateTime weekStartOf(DateTime day) {
  final d = DateTime(day.year, day.month, day.day);
  final dow = d.weekday; // 1=周一 .. 7=周日
  return d.subtract(Duration(days: dow - 1));
}

/// 输入：按日期升序的打卡记录。
/// 输出：按周升序的 PeriodActivitySnapshot（只含"截至该周末活跃"的类型）。
/// 周内没有活跃类型的周不会出现在输出（combiner 会再跳过一次，这里直接不产出空周）。
List<PeriodActivitySnapshot> buildWeeklySnapshots(
    List<CheckInDayEntry> entries) {
  if (entries.isEmpty) return <PeriodActivitySnapshot>[];

  // 1) 按周分组：weekStart(DateTime) -> Set<typeId 本周打过>
  final byWeek = <DateTime, Set<String>>{};
  final sorted = List<CheckInDayEntry>.from(entries)
    ..sort((a, b) => a.date.compareTo(b.date));
  for (final e in sorted) {
    final ws = weekStartOf(e.date);
    (byWeek[ws] ??= <String>{}).add(e.typeId);
  }
  final weekStarts = byWeek.keys.toList()..sort();

  // 2) 累积活跃集：截至当前周，历史打过一次的类型
  final activeSoFar = <String>{};
  final result = <PeriodActivitySnapshot>[];
  for (final ws in weekStarts) {
    final doneThisWeek = byWeek[ws]!;
    activeSoFar.addAll(doneThisWeek); // 本周打过的类型加入活跃集
    final rates = activeSoFar.map((typeId) {
      return TypePeriodCompletion(
        typeId: typeId,
        completionRate: doneThisWeek.contains(typeId) ? 1.0 : 0.0,
      );
    }).toList();
    result.add(PeriodActivitySnapshot(rates));
  }
  return result;
}

```

```dart
// ===== FILE: lib/utils/growth_aggregation.dart =====
// lib/utils/growth_aggregation.dart
//
// 成长曲线数据聚合：把 GrowthUpdateResult 序列按周/月/年聚合成 (label, score) 点列。
// 纯逻辑、无 IO，方便单测。
import 'package:ai_life_recorder/growth/growth_engine.dart';

/// 成长曲线视图档位。
enum AggregationView { week, month, year }

/// 成长曲线上的一个点。
class GrowthDataPoint {
  final String label;
  final double score;

  const GrowthDataPoint({required this.label, required this.score});

  @override
  String toString() => 'GrowthDataPoint(label: $label, score: $score)';
}

/// 把按周产出的 [GrowthUpdateResult] 序列聚合成指定视图点列。
///
/// 当前实现假设输入序列按时间从早到晚、每周一个元素；未来接入真实日期后，
/// 可改为按 [GrowthUpdateResult] 上的 createdAt 字段分组。
///
/// 聚合语义：
/// - [AggregationView.week]：取最近 12 个周期（每周）的期末 score。
///   理由：手机屏幕宽度有限，12 个点既能展示季度趋势，又不会造成坐标轴标签重叠。
/// - [AggregationView.month]：按自然月分组，每月约 4 周，取该月最后一周的期末 score。
/// - [AggregationView.year]：按自然年分组，每年约 52 周，取该年最后一周的期末 score。
List<GrowthDataPoint> aggregateGrowthSeries(
  List<GrowthUpdateResult> results,
  AggregationView view,
) {
  if (results.isEmpty) return [];

  switch (view) {
    case AggregationView.week:
      return _aggregateWeek(results);
    case AggregationView.month:
      return _aggregateMonth(results);
    case AggregationView.year:
      return _aggregateYear(results);
  }
}

List<GrowthDataPoint> _aggregateWeek(List<GrowthUpdateResult> results) {
  const maxWeeks = 12;
  final slice = results.length <= maxWeeks
      ? results
      : results.sublist(results.length - maxWeeks);
  return [
    for (var i = 0; i < slice.length; i++)
      GrowthDataPoint(
        label: '第${i + 1}周',
        score: slice[i].newState.score,
      ),
  ];
}

List<GrowthDataPoint> _aggregateMonth(List<GrowthUpdateResult> results) {
  const weeksPerMonth = 4;
  final points = <GrowthDataPoint>[];
  for (var i = 0; i < results.length; i += weeksPerMonth) {
    final end = i + weeksPerMonth;
    final chunk = end <= results.length
        ? results.sublist(i, end)
        : results.sublist(i);
    final last = chunk.last;
    points.add(GrowthDataPoint(
      label: '${points.length + 1}月',
      score: last.newState.score,
    ));
  }
  return points;
}

List<GrowthDataPoint> _aggregateYear(List<GrowthUpdateResult> results) {
  const weeksPerYear = 52;
  final points = <GrowthDataPoint>[];
  for (var i = 0; i < results.length; i += weeksPerYear) {
    final end = i + weeksPerYear;
    final chunk = end <= results.length
        ? results.sublist(i, end)
        : results.sublist(i);
    final last = chunk.last;
    points.add(GrowthDataPoint(
      label: '${points.length + 1}年',
      score: last.newState.score,
    ));
  }
  return points;
}

```

```dart
// ===== FILE: lib/ai/growth_ai.dart =====
// lib/ai/growth_ai.dart
//
// 成长曲线 AI 自然语言分析角色封装。
import 'dart:async';
import 'dart:convert';

import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/prompts.dart';

class GrowthAi {
  final AiClient client;

  GrowthAi({required this.client});

  /// 根据成长曲线得分序列生成温和的自然语言分析。
  /// 返回严格归一化的 JSON：{ "analysis": string }。
  Future<Map<String, dynamic>> generateGrowthAnalysis({
    required List<double> scores,
    required List<String> labels,
  }) async {
    final prompt = growthAnalysisPrompt(scores: scores, labels: labels);
    String raw;
    try {
      raw = await client.chat(
        systemPrompt: '你是成长分析助手，输出严格 JSON。',
        userPrompt: prompt,
        jsonMode: true,
      );
    } on AiException {
      rethrow;
    } catch (e) {
      throw AiException('GrowthAi unexpected error: $e');
    }

    String jsonText;
    try {
      jsonText = extractJson(raw);
    } on FormatException {
      throw AiParseException('Failed to extract JSON from AI response', raw);
    }

    try {
      final Map<String, dynamic> map = json.decode(jsonText);
      if (!map.containsKey('analysis') ||
          map['analysis'] == null ||
          (map['analysis'] is String &&
              (map['analysis'] as String).trim().isEmpty)) {
        throw AiParseException('Missing or empty analysis', raw);
      }
      map['analysis'] = (map['analysis'] as String).trim();
      return map;
    } on AiParseException {
      rethrow;
    } catch (e) {
      throw AiParseException('Failed to parse growth analysis JSON: $e', raw);
    }
  }
}

```

```dart
// ===== FILE: lib/repositories/check_in_record_repository.dart =====
import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/check_in_record.dart';

/// 打卡记录仓库（TASK-EXT-01）。
/// 覆盖式约束：同一天(date)同一类型(typeId)只保留一条最终记录——
/// 二次写入覆盖而非新增行（EXT-03 的覆盖式提交在数据层由此保证）。
/// 记录保存 symbolSnapshot/labelSnapshot，类型停用/改名不影响历史查询展示。
abstract class CheckInRecordRepository {
  /// 覆盖式保存：按 (date, type_id) upsert。
  Future<void> upsert(CheckInRecord record);
  Future<CheckInRecord?> getByDateAndType(DateTime date, String typeId);
  Future<List<CheckInRecord>> listByDate(DateTime date);

  /// 闭区间 [from, to]（本地日历日），按 date 升序。
  Future<List<CheckInRecord>> listByRange(DateTime from, DateTime to);

  /// 某类型的历史全部记录（含停用类型的快照记录），按 date 倒序。
  Future<List<CheckInRecord>> listByType(String typeId);

  /// 删除某天的某条打卡（清空/取消打卡用，删除记录 ≠ 删除类型）。
  Future<void> deleteByDateAndType(DateTime date, String typeId);
}

class SupabaseCheckInRecordRepository implements CheckInRecordRepository {
  final SupabaseClient client;
  SupabaseCheckInRecordRepository(this.client);

  @override
  Future<void> upsert(CheckInRecord record) async {
    try {
      await client
          .from('check_in_records')
          .upsert(record.toJson(), onConflict: 'date,type_id');
    } catch (e) {
      debugPrint('Supabase check_in_records.upsert failed: $e');
    }
  }

  @override
  Future<CheckInRecord?> getByDateAndType(DateTime date, String typeId) async {
    try {
      final data = await client
          .from('check_in_records')
          .select()
          .eq('date', CheckInRecord.dateKey(date))
          .eq('type_id', typeId)
          .maybeSingle();
      if (data == null) return null;
      return CheckInRecord.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e) {
      debugPrint('Supabase check_in_records.getByDateAndType failed: $e');
      return null;
    }
  }

  @override
  Future<List<CheckInRecord>> listByDate(DateTime date) async {
    try {
      final list = await client
          .from('check_in_records')
          .select()
          .eq('date', CheckInRecord.dateKey(date))
          .order('created_at', ascending: true);
      return _toList(list);
    } catch (e) {
      debugPrint('Supabase check_in_records.listByDate failed: $e');
      return <CheckInRecord>[];
    }
  }

  @override
  Future<List<CheckInRecord>> listByRange(DateTime from, DateTime to) async {
    try {
      final list = await client
          .from('check_in_records')
          .select()
          .gte('date', CheckInRecord.dateKey(from))
          .lte('date', CheckInRecord.dateKey(to))
          .order('date', ascending: true);
      return _toList(list);
    } catch (e) {
      debugPrint('Supabase check_in_records.listByRange failed: $e');
      return <CheckInRecord>[];
    }
  }

  @override
  Future<List<CheckInRecord>> listByType(String typeId) async {
    try {
      final list = await client
          .from('check_in_records')
          .select()
          .eq('type_id', typeId)
          .order('date', ascending: false);
      return _toList(list);
    } catch (e) {
      debugPrint('Supabase check_in_records.listByType failed: $e');
      return <CheckInRecord>[];
    }
  }

  @override
  Future<void> deleteByDateAndType(DateTime date, String typeId) async {
    try {
      await client
          .from('check_in_records')
          .delete()
          .eq('date', CheckInRecord.dateKey(date))
          .eq('type_id', typeId);
    } catch (e) {
      debugPrint('Supabase check_in_records.deleteByDateAndType failed: $e');
    }
  }

  List<CheckInRecord> _toList(dynamic list) {
    final arr = (list as List<dynamic>?) ?? <dynamic>[];
    return arr
        .map((e) => CheckInRecord.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }
}

class InMemoryCheckInRecordRepository implements CheckInRecordRepository {
  final List<CheckInRecord> _store = <CheckInRecord>[];

  @override
  Future<void> upsert(CheckInRecord record) async {
    // 覆盖式：同 (date, type_id) 只保留最新一条
    _store.removeWhere((e) =>
        CheckInRecord.dateKey(e.date) == CheckInRecord.dateKey(record.date) &&
        e.typeId == record.typeId);
    _store.add(record);
  }

  @override
  Future<CheckInRecord?> getByDateAndType(DateTime date, String typeId) async {
    final key = CheckInRecord.dateKey(date);
    for (final e in _store) {
      if (CheckInRecord.dateKey(e.date) == key && e.typeId == typeId) return e;
    }
    return null;
  }

  @override
  Future<List<CheckInRecord>> listByDate(DateTime date) async {
    final key = CheckInRecord.dateKey(date);
    final res =
        _store.where((e) => CheckInRecord.dateKey(e.date) == key).toList();
    res.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return res;
  }

  @override
  Future<List<CheckInRecord>> listByRange(DateTime from, DateTime to) async {
    final fk = CheckInRecord.dateKey(from);
    final tk = CheckInRecord.dateKey(to);
    final res = _store.where((e) {
      final k = CheckInRecord.dateKey(e.date);
      return k.compareTo(fk) >= 0 && k.compareTo(tk) <= 0;
    }).toList();
    res.sort((a, b) => a.date.compareTo(b.date));
    return res;
  }

  @override
  Future<List<CheckInRecord>> listByType(String typeId) async {
    final res = _store.where((e) => e.typeId == typeId).toList();
    res.sort((a, b) => b.date.compareTo(a.date));
    return res;
  }

  @override
  Future<void> deleteByDateAndType(DateTime date, String typeId) async {
    final key = CheckInRecord.dateKey(date);
    _store.removeWhere(
        (e) => CheckInRecord.dateKey(e.date) == key && e.typeId == typeId);
  }
}

```

## 附带：设置页入口片段（settings_screen.dart 相关 ListTile）
```dart

                  MaterialPageRoute(builder: (_) => const NoteListScreen()),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.trending_up_rounded),
>             title: const Text('成长曲线'),
              subtitle: const Text('周/月/年坡度 + AI 分析'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.push(
                  context,
>                 MaterialPageRoute(builder: (_) => const GrowthCurveScreen()),
                );
              },
            ),
          ],




```