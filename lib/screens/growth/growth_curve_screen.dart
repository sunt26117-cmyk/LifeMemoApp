// lib/screens/growth/growth_curve_screen.dart
//
// 成长曲线页面：周/月/年三档平滑曲线 + AI 自然语言分析。
// 评审优化（2026-09-05）：可滚动防小屏溢出 / Y=0 虚线基准 / 单点 X 轴保护 / 切视图清空旧分析。
import 'dart:math' as math;
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
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildSegmentedControl(),
              const SizedBox(height: 16),
              SizedBox(
                height: 300,
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
              const SizedBox(height: 16),
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
                const SizedBox(height: 16),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.auto_awesome,
                                size: 18, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Text('${_viewLabel(_view)}成长洞察',
                                style: const TextStyle(
                                    fontSize: 14, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const Divider(height: 20),
                        Text(
                          _analysis!,
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.6,
                          ),
                        ),
                      ],
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

  String _viewLabel(AggregationView view) {
    switch (view) {
      case AggregationView.week:
        return '周维度';
      case AggregationView.month:
        return '月维度';
      case AggregationView.year:
        return '年维度';
    }
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
        if (selected.isNotEmpty && selected.first != _view) {
          setState(() {
            _view = selected.first;
            _analysis = null; // 切视图清空旧维度分析，避免图文脱节
          });
        }
      },
    );
  }

  LineChartData _buildLineChartData(List<GrowthDataPoint> points) {
    final isSinglePoint = points.length == 1;

    final spots = [
      for (var i = 0; i < points.length; i++)
        FlSpot(i.toDouble(), points[i].score),
    ];

    var minScore = points.map((p) => p.score).reduce(math.min);
    var maxScore = points.map((p) => p.score).reduce(math.max);
    // math.min/max 返回 num，显式转 double（Iterable<double>.reduce 要求 double 函数）
    final minD = (minScore as num).toDouble();
    final maxD = (maxScore as num).toDouble();
    final padding = ((maxD - minD).abs() * 0.1).clamp(5.0, 20.0);

    // Y 轴覆盖 0，保证正负分水岭可见
    var effectiveMinY = minD - padding;
    var effectiveMaxY = maxD + padding;
    if (effectiveMinY > 0) effectiveMinY = 0;
    if (effectiveMaxY < 0) effectiveMaxY = 0;
    if (effectiveMinY == effectiveMaxY) {
      effectiveMinY -= 10;
      effectiveMaxY += 10;
    }

    return LineChartData(
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        horizontalInterval: _niceInterval(effectiveMinY, effectiveMaxY),
      ),
      extraLinesData: ExtraLinesData(
        horizontalLines: [
          HorizontalLine(
            y: 0,
            color: const Color(0x449E9E9E),
            strokeWidth: 1,
            dashArray: const [4, 4],
          ),
        ],
      ),
      titlesData: FlTitlesData(
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            interval: 1,
            getTitlesWidget: (value, meta) {
              final index = value.round();
              if (index < 0 || index >= points.length) return const SizedBox();
              if ((value - index).abs() > 0.1) return const SizedBox();
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
      minX: isSinglePoint ? -0.5 : 0,
      maxX: isSinglePoint ? 0.5 : (points.length - 1).toDouble(),
      minY: effectiveMinY,
      maxY: effectiveMaxY,
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          isCurved: !isSinglePoint,
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

/// 空态引导：还没有任何真实成长数据时展示
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
