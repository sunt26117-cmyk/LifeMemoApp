import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/theme.dart';
import 'package:ai_life_recorder/models/trend.dart';
import 'package:ai_life_recorder/repositories/theme_repository.dart';

class TrendDetailScreen extends StatefulWidget {
  const TrendDetailScreen({
    super.key,
    required this.trend,
    required this.themeRepository,
  });

  final Trend trend;
  final ThemeRepository themeRepository;

  @override
  State<TrendDetailScreen> createState() => _TrendDetailScreenState();
}

class _TrendDetailScreenState extends State<TrendDetailScreen> {
  bool _loading = true;
  String? _error;
  ThemeItem? _relatedTheme;

  @override
  void initState() {
    super.initState();
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final List<ThemeItem> themes = await widget.themeRepository.listAll();
      ThemeItem? found;
      for (final ThemeItem t in themes) {
        if ((t.trendNames).contains(widget.trend.trendName)) {
          found = t;
          break;
        }
      }
      setState(() {
        _relatedTheme = found;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = '加载主题信息失败：$e';
        _loading = false;
      });
    }
  }

  Color _directionColor(ThemeDirection direction) {
    switch (direction) {
      case ThemeDirection.improving:
        return const Color(0xFF4CAF50);
      case ThemeDirection.stable:
        return const Color(0xFF9E9E9E);
      case ThemeDirection.worsening:
        return const Color(0xFFF44336);
    }
  }

  @override
  Widget build(BuildContext context) {
    final Trend trend = widget.trend;
    final List<Map<String, dynamic>> evidence =
        List<Map<String, dynamic>>.from(trend.evidence);
    // 按时间升序排列用于画图（最早的在左边）
    evidence.sort((a, b) {
      final DateTime ta = DateTime.parse(a['time'] as String);
      final DateTime tb = DateTime.parse(b['time'] as String);
      return ta.compareTo(tb);
    });

    return Scaffold(
      appBar: AppBar(title: const Text('趋势详情')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          trend.trendName,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _directionColor(trend.direction)
                              .withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          trend.direction.value,
                          style: TextStyle(
                              color: _directionColor(trend.direction),
                              fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('分类: ${trend.category}'),
                  Text('分数: ${trend.score.toStringAsFixed(1)}'),
                  Text('权重: ${trend.weight.toStringAsFixed(1)}'),
                  Text('更新时间: ${trend.updatedAt}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('趋势走向',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 200,
                    child: evidence.isEmpty
                        ? const Center(
                            child: Text('暂无证据',
                                style: TextStyle(color: Colors.grey)),
                          )
                        : LineChart(
                            LineChartData(
                              gridData: const FlGridData(show: true),
                              titlesData: const FlTitlesData(show: false),
                              borderData: FlBorderData(show: true),
                              lineBarsData: [
                                LineChartBarData(
                                  spots: [
                                    for (int i = 0; i < evidence.length; i++)
                                      FlSpot(
                                          i.toDouble(),
                                          (evidence[i]['delta'] as num)
                                              .toDouble()),
                                  ],
                                  isCurved: false,
                                  color: _directionColor(trend.direction),
                                  barWidth: 2,
                                  dotData: const FlDotData(show: true),
                                ),
                              ],
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('证据',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (trend.evidence.isEmpty)
                    const Text('暂无证据', style: TextStyle(color: Colors.grey))
                  else
                    ...trend.evidence.map((e) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Text(
                            '${e['time']}  ${e['event']}  delta: ${e['delta']}'),
                      );
                    }),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('所属主题',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (_loading)
                    const Center(child: CircularProgressIndicator())
                  else if (_error != null)
                    Text(_error!, style: const TextStyle(color: Colors.red))
                  else if (_relatedTheme == null)
                    const Text('暂无关联主题', style: TextStyle(color: Colors.grey))
                  else
                    Row(
                      children: [
                        Text(_relatedTheme!.themeName),
                        const SizedBox(width: 8),
                        Text(
                          _relatedTheme!.direction.value,
                          style: TextStyle(
                              color: _directionColor(_relatedTheme!.direction)),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
