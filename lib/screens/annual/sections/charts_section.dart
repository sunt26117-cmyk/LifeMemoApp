import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/summary.dart';

class ChartsSection extends StatelessWidget {
  const ChartsSection({
    super.key,
    required this.summary,
    required this.animate,
  });

  final Summary summary;
  final bool animate;

  static const List<Color> _palette = <Color>[
    AppColors.primary,
    Color(0xFF4CAF50),
    Color(0xFFFF9800),
    Color(0xFFF44336),
    Color(0xFF9E9E9E),
    Color(0xFF7C4DFF),
    Color(0xFF26A69A),
    Color(0xFFEF5350),
    Color(0xFF42A5F5),
    Color(0xFFAB47BC),
  ];

  @override
  Widget build(BuildContext context) {
    final Map<String, dynamic>? annual =
        summary.chartData['annual'] as Map<String, dynamic>?;

    final Widget content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Text(
          '年度趋势',
          style: TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 14),
        if (annual == null)
          const _EmptyChartCard()
        else
          _buildCharts(context, annual),
      ],
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: animate
          ? content
              .animate()
              .fadeIn(
                duration: const Duration(milliseconds: 250),
                delay: const Duration(milliseconds: 50),
              )
              .slideX(
                begin: 0.1,
                duration: const Duration(milliseconds: 300),
                curve: Curves.decelerate,
              )
              .scale(
                begin: const Offset(0.95, 0.95),
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutBack,
              )
          : content,
    );
  }

  Widget _buildCharts(
    BuildContext context,
    Map<String, dynamic> annual,
  ) {
    final List<String> months = _readStringList(annual['months']);

    final List<int> memoryTrend = _readIntList(annual['memoryTrend']);

    final List<int> photoTrend = _readIntList(annual['photoTrend']);

    final Map<String, List<int>> moodTrend =
        _readSeriesMap(annual['moodTrend']);

    final Map<String, List<int>> tagTrend = _readSeriesMap(annual['tagTrend']);

    final bool truncated = annual['truncated'] == true;

    if (months.isEmpty) {
      return const _EmptyChartCard();
    }

    return Column(
      children: <Widget>[
        _ChartCard(
          title: '记录趋势',
          subtitle: '记忆与照片按月统计',
          child: _buildRecordLineChart(
            months: months,
            memoryTrend: memoryTrend,
            photoTrend: photoTrend,
          ),
        ),
        const SizedBox(height: 14),
        _ChartCard(
          title: '情绪趋势',
          subtitle: '每月情绪构成',
          child: _buildMoodChart(
            months: months,
            moodTrend: moodTrend,
          ),
        ),
        const SizedBox(height: 14),
        _ChartCard(
          title: '标签趋势',
          subtitle: '全年出现频率最高的标签',
          child: _buildTagChart(
            months: months,
            tagTrend: tagTrend,
          ),
        ),
        if (truncated) ...<Widget>[
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              '数据量较大，当前图表为本次扫描范围统计',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildRecordLineChart({
    required List<String> months,
    required List<int> memoryTrend,
    required List<int> photoTrend,
  }) {
    if (_allZero(memoryTrend) && _allZero(photoTrend)) {
      return const _ChartEmptyMessage(
        text: '暂无记录趋势数据',
      );
    }

    final int count = months.length;

    final List<FlSpot> memorySpots = <FlSpot>[
      for (int i = 0; i < count; i++)
        FlSpot(
          i.toDouble(),
          (i < memoryTrend.length ? memoryTrend[i] : 0).toDouble(),
        ),
    ];

    final List<FlSpot> photoSpots = <FlSpot>[
      for (int i = 0; i < count; i++)
        FlSpot(
          i.toDouble(),
          (i < photoTrend.length ? photoTrend[i] : 0).toDouble(),
        ),
    ];

    final double maxValue = _maxValue(
      <List<int>>[
        memoryTrend,
        photoTrend,
      ],
    );

    return SizedBox(
      height: 240,
      child: LineChart(
        LineChartData(
          minX: 0,
          maxX: count > 1 ? (count - 1).toDouble() : 1,
          minY: 0,
          maxY: maxValue <= 0 ? 1 : maxValue + 1,
          gridData: const FlGridData(
            show: true,
          ),
          borderData: FlBorderData(
            show: false,
          ),
          lineTouchData: const LineTouchData(
            enabled: true,
          ),
          titlesData: FlTitlesData(
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
                reservedSize: 30,
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30,
                getTitlesWidget: (
                  double value,
                  TitleMeta meta,
                ) {
                  final int index = value.round();

                  if (index < 0 || index >= months.length) {
                    return const SizedBox.shrink();
                  }

                  final String month = months[index];
                  final String label =
                      month.length >= 7 ? month.substring(5) : month;

                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      label,
                      style: const TextStyle(
                        fontSize: 10,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          lineBarsData: <LineChartBarData>[
            LineChartBarData(
              spots: memorySpots,
              isCurved: true,
              color: AppColors.primary,
              barWidth: 3,
              dotData: const FlDotData(
                show: false,
              ),
            ),
            LineChartBarData(
              spots: photoSpots,
              isCurved: true,
              color: const Color(0xFFFF9800),
              barWidth: 3,
              dotData: const FlDotData(
                show: false,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMoodChart({
    required List<String> months,
    required Map<String, List<int>> moodTrend,
  }) {
    final List<String> emotionNames = Emotion.values
        .map((Emotion emotion) => emotion.value)
        .toList(growable: false);

    final bool hasData = moodTrend.values.any(
      (List<int> values) => values.any(
        (int value) => value > 0,
      ),
    );

    if (!hasData) {
      return const _ChartEmptyMessage(
        text: '暂无情绪数据',
      );
    }

    final List<BarChartGroupData> groups = <BarChartGroupData>[];

    for (int monthIndex = 0; monthIndex < months.length; monthIndex++) {
      double cursor = 0;

      final List<BarChartRodStackItem> stackItems = <BarChartRodStackItem>[];

      for (int emotionIndex = 0;
          emotionIndex < emotionNames.length;
          emotionIndex++) {
        final String emotion = emotionNames[emotionIndex];
        final List<int> series = moodTrend[emotion] ?? <int>[];

        final int value = monthIndex < series.length ? series[monthIndex] : 0;

        if (value <= 0) {
          continue;
        }

        final double start = cursor;
        final double end = cursor + value.toDouble();

        stackItems.add(
          BarChartRodStackItem(
            start,
            end,
            _palette[emotionIndex % _palette.length],
          ),
        );

        cursor = end;
      }

      groups.add(
        BarChartGroupData(
          x: monthIndex,
          barRods: <BarChartRodData>[
            BarChartRodData(
              toY: cursor,
              width: 16,
              borderRadius: BorderRadius.circular(3),
              rodStackItems: stackItems,
            ),
          ],
        ),
      );
    }

    final double maxY = groups.fold<double>(
          0,
          (double current, BarChartGroupData group) {
            if (group.barRods.isEmpty) {
              return current;
            }

            final double value = group.barRods.first.toY;

            return value > current ? value : current;
          },
        ) +
        1;

    return Column(
      children: <Widget>[
        SizedBox(
          height: 230,
          child: BarChart(
            BarChartData(
              minY: 0,
              maxY: maxY,
              alignment: BarChartAlignment.spaceAround,
              groupsSpace: 8,
              barGroups: groups,
              gridData: const FlGridData(
                show: true,
              ),
              borderData: FlBorderData(
                show: false,
              ),
              titlesData: FlTitlesData(
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
                    reservedSize: 30,
                  ),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 30,
                    getTitlesWidget: (
                      double value,
                      TitleMeta meta,
                    ) {
                      final int index = value.round();

                      if (index < 0 || index >= months.length) {
                        return const SizedBox.shrink();
                      }

                      final String month = months[index];

                      final String label =
                          month.length >= 7 ? month.substring(5) : month;

                      return Padding(
                        padding: const EdgeInsets.only(
                          top: 8,
                        ),
                        child: Text(
                          label,
                          style: const TextStyle(
                            fontSize: 10,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 8,
          children: <Widget>[
            for (int i = 0; i < emotionNames.length; i++)
              _LegendItem(
                label: emotionNames[i],
                color: _palette[i % _palette.length],
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildTagChart({
    required List<String> months,
    required Map<String, List<int>> tagTrend,
  }) {
    if (tagTrend.isEmpty) {
      return const _ChartEmptyMessage(
        text: '暂无标签趋势数据',
      );
    }

    final List<String> tags = tagTrend.keys.toList();

    final List<LineChartBarData> lines = <LineChartBarData>[];

    for (int tagIndex = 0; tagIndex < tags.length; tagIndex++) {
      final String tag = tags[tagIndex];
      final List<int> series = tagTrend[tag] ?? <int>[];

      final List<FlSpot> spots = <FlSpot>[
        for (int monthIndex = 0; monthIndex < months.length; monthIndex++)
          FlSpot(
            monthIndex.toDouble(),
            (monthIndex < series.length ? series[monthIndex] : 0).toDouble(),
          ),
      ];

      lines.add(
        LineChartBarData(
          spots: spots,
          isCurved: true,
          color: _palette[tagIndex % _palette.length],
          barWidth: 2.5,
          dotData: const FlDotData(
            show: false,
          ),
        ),
      );
    }

    final double maxY = _maxValue(
      tagTrend.values.toList(),
    );

    final bool allZero = tagTrend.values.every(
      (List<int> values) => values.every(
        (int value) => value == 0,
      ),
    );

    if (allZero) {
      return const _ChartEmptyMessage(
        text: '暂无标签趋势数据',
      );
    }

    return Column(
      children: <Widget>[
        SizedBox(
          height: 240,
          child: LineChart(
            LineChartData(
              minX: 0,
              maxX: months.length > 1 ? (months.length - 1).toDouble() : 1,
              minY: 0,
              maxY: maxY <= 0 ? 1 : maxY + 1,
              gridData: const FlGridData(
                show: true,
              ),
              borderData: FlBorderData(
                show: false,
              ),
              titlesData: FlTitlesData(
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
                    reservedSize: 30,
                  ),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 30,
                    getTitlesWidget: (
                      double value,
                      TitleMeta meta,
                    ) {
                      final int index = value.round();

                      if (index < 0 || index >= months.length) {
                        return const SizedBox.shrink();
                      }

                      final String month = months[index];

                      final String label =
                          month.length >= 7 ? month.substring(5) : month;

                      return Padding(
                        padding: const EdgeInsets.only(
                          top: 8,
                        ),
                        child: Text(
                          label,
                          style: const TextStyle(
                            fontSize: 10,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
              lineBarsData: lines,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 8,
          children: <Widget>[
            for (int i = 0; i < tags.length; i++)
              _LegendItem(
                label: tags[i],
                color: _palette[i % _palette.length],
              ),
          ],
        ),
      ],
    );
  }

  List<String> _readStringList(dynamic value) {
    if (value is! List) {
      return <String>[];
    }

    return value
        .whereType<String>()
        .map((String item) => item.trim())
        .where((String item) => item.isNotEmpty)
        .toList();
  }

  List<int> _readIntList(dynamic value) {
    if (value is! List) {
      return <int>[];
    }

    return value.whereType<num>().map((num item) => item.toInt()).toList();
  }

  Map<String, List<int>> _readSeriesMap(dynamic value) {
    if (value is! Map) {
      return <String, List<int>>{};
    }

    final Map<String, List<int>> result = <String, List<int>>{};

    value.forEach((dynamic key, dynamic value) {
      if (key is! String || value is! List) {
        return;
      }

      result[key] =
          value.whereType<num>().map((num item) => item.toInt()).toList();
    });

    return result;
  }

  bool _allZero(List<int> values) {
    return values.isEmpty || values.every((int value) => value == 0);
  }

  double _maxValue(List<List<int>> seriesList) {
    double result = 0;

    for (final List<int> series in seriesList) {
      for (final int value in series) {
        if (value > result) {
          result = value.toDouble();
        }
      }
    }

    return result;
  }
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            title,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            subtitle,
            style: const TextStyle(
              color: Colors.grey,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  const _LegendItem({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Container(
          width: 9,
          height: 9,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

class _ChartEmptyMessage extends StatelessWidget {
  const _ChartEmptyMessage({
    required this.text,
  });

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 120,
      alignment: Alignment.center,
      child: Text(
        text,
        style: const TextStyle(
          color: AppColors.neutral,
          fontSize: 13,
        ),
      ),
    );
  }
}

class _EmptyChartCard extends StatelessWidget {
  const _EmptyChartCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: const Text(
        '暂无图表数据',
        style: TextStyle(
          color: AppColors.neutral,
        ),
      ),
    );
  }
}
