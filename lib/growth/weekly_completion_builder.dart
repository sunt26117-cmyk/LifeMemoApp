// lib/growth/weekly_completion_builder.dart
//
// 真实数据统计层核心（纯逻辑，可单测）：把 CheckInRecord 打卡记录按周切分，
// 产出 MultiTypeGrowthCombiner 需要的 PeriodActivitySnapshot 列表。
//
// 「每周完成率」口径（2026-09-04 用户确认）：
// - 某类型在追踪中(活跃) = 首次打过后进入追踪；连续缺卡 ≥[dormantThresholdWeeks] 周自动休眠
//   （移出活跃分母，不再拖累分数），再次打卡自动唤醒重入活跃集。
// - 某类型本周完成率 = 本周打过 ? 1.0 : 0.0（打了就算坚持，不因频次低被罚）。
// - 每周整体完成率 = 本周完成类型数 ÷ 该周活跃类型数（combiner 内取平均）。
// - 无活跃类型的周跳过（不产生虚假暴跌）。
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

class _TypeLifecycleTracker {
  final String typeId;
  int consecutiveMissedWeeks = 0;
  bool isDormant = false;
  _TypeLifecycleTracker(this.typeId);
}

/// 输入：按时间升序的打卡记录。
/// 输出：按周升序的 PeriodActivitySnapshot。
/// [dormantThresholdWeeks]：连续缺卡达到该周数后移出活跃分母（默认 4 周），再次打卡自动唤醒。
List<PeriodActivitySnapshot> buildWeeklySnapshots(List<CheckInDayEntry> entries,
    {int dormantThresholdWeeks = 4}) {
  if (entries.isEmpty) return <PeriodActivitySnapshot>[];

  // 1) 按周分组：weekStart -> Set<本周打过的 typeId>
  DateTime? minDate;
  DateTime? maxDate;
  final byWeek = <DateTime, Set<String>>{};
  for (final e in entries) {
    if (minDate == null || e.date.isBefore(minDate)) minDate = e.date;
    if (maxDate == null || e.date.isAfter(maxDate)) maxDate = e.date;
    final ws = weekStartOf(e.date);
    (byWeek[ws] ??= <String>{}).add(e.typeId);
  }
  if (minDate == null || maxDate == null) return <PeriodActivitySnapshot>[];

  // 2) 从最早打卡周逐周推进到最后打卡周（中间空周用于累计缺卡，触发休眠）
  final trackers = <String, _TypeLifecycleTracker>{};
  final result = <PeriodActivitySnapshot>[];
  var current = weekStartOf(minDate);
  final lastWeek = weekStartOf(maxDate);

  while (!current.isAfter(lastWeek)) {
    final doneThisWeek = byWeek[current] ?? const <String>{};
    // 本周出现的类型首次纳入追踪
    for (final typeId in doneThisWeek) {
      trackers.putIfAbsent(typeId, () => _TypeLifecycleTracker(typeId));
    }
    final rates = <TypePeriodCompletion>[];
    for (final tracker in trackers.values) {
      final has = doneThisWeek.contains(tracker.typeId);
      if (has) {
        // 再打卡自动唤醒并清零缺卡计数
        tracker.isDormant = false;
        tracker.consecutiveMissedWeeks = 0;
        rates.add(
            TypePeriodCompletion(typeId: tracker.typeId, completionRate: 1.0));
      } else if (!tracker.isDormant) {
        // 未休眠但本周缺卡：仍算活跃（完成率 0），缺卡计数 +1；达到阈值则休眠
        rates.add(
            TypePeriodCompletion(typeId: tracker.typeId, completionRate: 0.0));
        tracker.consecutiveMissedWeeks++;
        if (tracker.consecutiveMissedWeeks >= dormantThresholdWeeks) {
          tracker.isDormant = true;
        }
      }
      // 已休眠类型直接跳过（移出分母）
    }
    if (rates.isNotEmpty) {
      result.add(PeriodActivitySnapshot(rates));
    }
    current = DateTime(current.year, current.month, current.day + 7);
  }
  return result;
}
