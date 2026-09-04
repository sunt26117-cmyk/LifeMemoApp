import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/summary.dart';
import 'package:ai_life_recorder/models/task_prefill.dart';
import 'package:ai_life_recorder/screens/task/task_edit_screen.dart';

class SummaryDetailScreen extends StatelessWidget {
  const SummaryDetailScreen({
    super.key,
    required this.summary,
  });

  final Summary summary;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('总结详情'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            _buildHeaderCard(),
            const SizedBox(height: 12),
            _buildContentCard(),
            if (summary.themes.isNotEmpty) ...<Widget>[
              const SizedBox(height: 12),
              _buildThemesCard(),
            ],
            if (summary.highlights.isNotEmpty) ...<Widget>[
              const SizedBox(height: 12),
              _buildHighlightsCard(),
            ],
            const SizedBox(height: 12),
            _buildChartCard(),
            if (summary.taskSuggestions.isNotEmpty) ...<Widget>[
              const SizedBox(height: 12),
              _buildTaskSuggestionsCard(context),
            ],
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Card(
      color: Colors.white,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.10),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    summary.type.value,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _periodText(),
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              '创建时间：${_formatDateTime(summary.createdAt)}',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContentCard() {
    return _SectionCard(
      title: '总结正文',
      child: Text(
        summary.content ?? '',
        style: const TextStyle(
          fontSize: 14,
          height: 1.7,
        ),
      ),
    );
  }

  Widget _buildThemesCard() {
    return _SectionCard(
      title: '主题',
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: summary.themes.map((theme) {
          return Chip(
            label: Text(
              theme,
              style: const TextStyle(
                fontSize: 12,
              ),
            ),
            backgroundColor: AppColors.primary.withOpacity(0.10),
            side: BorderSide.none,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildHighlightsCard() {
    return _SectionCard(
      title: '重点',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: summary.highlights.map((highlight) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              '• $highlight',
              style: const TextStyle(
                fontSize: 14,
                height: 1.5,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildChartCard() {
    final chartData = summary.chartData;

    final memoryMap = _readIntMap(chartData['memoryByDay']);
    final photoMap = _readIntMap(chartData['photoByDay']);

    if (memoryMap.isEmpty && photoMap.isEmpty) {
      return const _EmptyChartCard();
    }

    final days = <String>{
      ...memoryMap.keys,
      ...photoMap.keys,
    }.toList()
      ..sort();

    if (days.isEmpty) {
      return const _EmptyChartCard();
    }

    final memoryValues = days.map((day) => memoryMap[day] ?? 0).toList();

    final photoValues = days.map((day) => photoMap[day] ?? 0).toList();

    final maxValue = <int>[
      ...memoryValues,
      ...photoValues,
    ].fold<int>(
      0,
      (int current, int value) => value > current ? value : current,
    );

    final maxY = maxValue <= 0 ? 1.0 : (maxValue + 1).toDouble();

    return _SectionCard(
      title: '记录趋势',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            '按天统计',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 220,
            child: BarChart(
              BarChartData(
                minY: 0,
                maxY: maxY,
                alignment: BarChartAlignment.spaceAround,
                barTouchData: BarTouchData(
                  enabled: false,
                ),
                gridData: const FlGridData(
                  show: true,
                ),
                borderData: FlBorderData(
                  show: false,
                ),
                barGroups: List<BarChartGroupData>.generate(
                  days.length,
                  (int index) {
                    final memory = memoryValues[index];
                    final photo = photoValues[index];

                    return BarChartGroupData(
                      x: index,
                      barsSpace: 4,
                      barRods: <BarChartRodData>[
                        BarChartRodData(
                          toY: (memory + photo).toDouble(),
                          width: 16,
                          borderRadius: BorderRadius.circular(4),
                          color: AppColors.primary,
                        ),
                      ],
                    );
                  },
                ),
                titlesData: _buildBarTitles(days),
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (memoryMap.isNotEmpty && photoMap.isNotEmpty)
            SizedBox(
              height: 240,
              child: LineChart(
                LineChartData(
                  minY: 0,
                  maxY: maxY,
                  gridData: const FlGridData(
                    show: true,
                  ),
                  borderData: FlBorderData(
                    show: false,
                  ),
                  titlesData: _buildLineTitles(days),
                  lineBarsData: <LineChartBarData>[
                    LineChartBarData(
                      spots: List<FlSpot>.generate(
                        days.length,
                        (int index) => FlSpot(
                          index.toDouble(),
                          memoryValues[index].toDouble(),
                        ),
                      ),
                      isCurved: true,
                      color: AppColors.primary,
                      barWidth: 3,
                      dotData: const FlDotData(
                        show: false,
                      ),
                    ),
                    LineChartBarData(
                      spots: List<FlSpot>.generate(
                        days.length,
                        (int index) => FlSpot(
                          index.toDouble(),
                          photoValues[index].toDouble(),
                        ),
                      ),
                      isCurved: true,
                      color: AppColors.warning,
                      barWidth: 3,
                      dotData: const FlDotData(
                        show: false,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (memoryMap.isNotEmpty && photoMap.isNotEmpty) ...<Widget>[
            const SizedBox(height: 8),
            const Row(
              children: <Widget>[
                _ChartLegend(
                  color: AppColors.primary,
                  text: '记忆',
                ),
                SizedBox(width: 16),
                _ChartLegend(
                  color: AppColors.warning,
                  text: '照片',
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTaskSuggestionsCard(BuildContext context) {
    return _SectionCard(
      title: '任务建议',
      child: Column(
        children: summary.taskSuggestions.map((suggestion) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(
                  color: Colors.grey.shade200,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    suggestion,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 48,
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {
                        final prefill = TaskPrefill(
                          title: suggestion,
                          description: summary.content ?? '',
                          sourceReflectionId: summary.id,
                          defaultCategory: TaskCategory.planning,
                        );

                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (BuildContext context) {
                              return TaskEditScreen(
                                prefill: prefill,
                              );
                            },
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text('创建任务'),
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  FlTitlesData _buildBarTitles(List<String> days) {
    return FlTitlesData(
      topTitles: const AxisTitles(
        sideTitles: SideTitles(
          showTitles: false,
        ),
      ),
      rightTitles: const AxisTitles(
        sideTitles: SideTitles(
          showTitles: false,
        ),
      ),
      leftTitles: const AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 32,
        ),
      ),
      bottomTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 32,
          getTitlesWidget: (double value, TitleMeta meta) {
            final index = value.toInt();

            if (index < 0 || index >= days.length) {
              return const SizedBox.shrink();
            }

            return Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                _monthDay(days[index]),
                style: const TextStyle(
                  fontSize: 10,
                  color: Colors.grey,
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  FlTitlesData _buildLineTitles(List<String> days) {
    return FlTitlesData(
      topTitles: const AxisTitles(
        sideTitles: SideTitles(
          showTitles: false,
        ),
      ),
      rightTitles: const AxisTitles(
        sideTitles: SideTitles(
          showTitles: false,
        ),
      ),
      leftTitles: const AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 32,
        ),
      ),
      bottomTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 32,
          getTitlesWidget: (double value, TitleMeta meta) {
            final index = value.toInt();

            if (index < 0 || index >= days.length) {
              return const SizedBox.shrink();
            }

            return Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                _monthDay(days[index]),
                style: const TextStyle(
                  fontSize: 10,
                  color: Colors.grey,
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Map<String, int> _readIntMap(dynamic value) {
    if (value is! Map) {
      return <String, int>{};
    }

    final result = <String, int>{};

    value.forEach((dynamic key, dynamic value) {
      if (key is String && value is num) {
        result[key] = value.toInt();
      }
    });

    return result;
  }

  String _periodText() {
    return '${_formatDate(summary.periodStart)}'
        ' ~ '
        '${_formatDate(summary.periodEnd)}';
  }

  String _formatDate(DateTime value) {
    final local = value.toLocal();
    return '${local.year}年${local.month}月${local.day}日';
  }

  String _formatDateTime(DateTime value) {
    final local = value.toLocal();

    String twoDigits(int number) {
      return number.toString().padLeft(2, '0');
    }

    return '${local.year}年'
        '${local.month}月'
        '${local.day}日 '
        '${twoDigits(local.hour)}:'
        '${twoDigits(local.minute)}';
  }

  String _monthDay(String value) {
    final parts = value.split('-');

    if (parts.length != 3) {
      return value;
    }

    return '${parts[1]}-${parts[2]}';
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _EmptyChartCard extends StatelessWidget {
  const _EmptyChartCard();

  @override
  Widget build(BuildContext context) {
    return const _SectionCard(
      title: '记录趋势',
      child: Text(
        '暂无图表数据',
        style: TextStyle(
          fontSize: 12,
          color: Colors.grey,
        ),
      ),
    );
  }
}

class _ChartLegend extends StatelessWidget {
  const _ChartLegend({
    required this.color,
    required this.text,
  });

  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 5),
        Text(
          text,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }
}
