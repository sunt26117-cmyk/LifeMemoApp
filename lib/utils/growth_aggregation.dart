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
