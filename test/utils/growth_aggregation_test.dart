// test/utils/growth_aggregation_test.dart
import 'package:ai_life_recorder/growth/growth_engine.dart';
import 'package:ai_life_recorder/utils/growth_aggregation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('aggregateGrowthSeries', () {
    late List<GrowthUpdateResult> series;

    setUp(() {
      const engine = GrowthEngine();
      final initial = GrowthState.initial();
      // 15 周完成率：0.6 -> 0.9 波动
      final rates = <double>[
        0.60, 0.65, 0.70, 0.75, // 月 1
        0.72, 0.78, 0.80, 0.82, // 月 2
        0.85, 0.88, 0.90, 0.89, // 月 3
        0.91, 0.92, 0.93, // 月 4 部分
      ];
      series = engine.computeSeries(
        initialState: initial,
        completionRates: rates,
      );
    });

    test('week 视图取最近 12 周', () {
      final points = aggregateGrowthSeries(series, AggregationView.week);
      expect(points.length, 12);
      expect(points.first.label, '第1周');
      expect(points.last.score, series.last.newState.score);
    });

    test('month 视图按 4 周分组聚合', () {
      final points = aggregateGrowthSeries(series, AggregationView.month);
      // 15 周 / 4 = 4 组（3 整组 + 1 余数组）
      expect(points.length, 4);
      expect(points[0].score, series[3].newState.score);
      expect(points[1].score, series[7].newState.score);
      expect(points[2].score, series[11].newState.score);
      expect(points[3].score, series[14].newState.score);
    });

    test('year 视图 15 周应返回 1 个点', () {
      final points = aggregateGrowthSeries(series, AggregationView.year);
      expect(points.length, 1);
      expect(points.single.score, series.last.newState.score);
    });

    test('空序列返回空', () {
      final points = aggregateGrowthSeries([], AggregationView.week);
      expect(points, isEmpty);
    });

    test('单点序列返回单点', () {
      const engine = GrowthEngine();
      final single = engine.computeSeries(
        initialState: GrowthState.initial(),
        completionRates: [0.8],
      );
      final week = aggregateGrowthSeries(single, AggregationView.week);
      final month = aggregateGrowthSeries(single, AggregationView.month);
      final year = aggregateGrowthSeries(single, AggregationView.year);
      expect(week.length, 1);
      expect(month.length, 1);
      expect(year.length, 1);
    });
  });
}
