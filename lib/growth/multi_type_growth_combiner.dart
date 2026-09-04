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
