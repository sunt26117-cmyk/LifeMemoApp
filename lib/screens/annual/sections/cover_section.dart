import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import 'package:ai_life_recorder/models/summary.dart';

class CoverSection extends StatelessWidget {
  const CoverSection({
    super.key,
    required this.summary,
    required this.animate,
  });

  final Summary summary;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final Map<String, dynamic>? annual =
        summary.chartData['annual'] as Map<String, dynamic>?;

    final List<int> memoryTrend = _readIntList(annual?['memoryTrend']);

    final List<int> photoTrend = _readIntList(annual?['photoTrend']);

    final Map<String, List<int>> moodTrend =
        _readMoodTrend(annual?['moodTrend']);

    final int memoryCount = _sum(memoryTrend);
    final int photoCount = _sum(photoTrend);
    final int reflectionCount = _sumNested(moodTrend);

    final Widget content = Container(
      width: double.infinity,
      constraints: const BoxConstraints(
        minHeight: 230,
      ),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            Color(0xFF4A90D9),
            Color(0xFF303F9F),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            '${summary.periodStart.toLocal().year}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 48,
              height: 1,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            '年度回顾',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 18,
              fontWeight: FontWeight.w500,
            ),
          ),
          const Spacer(),
          Row(
            children: <Widget>[
              Expanded(
                child: _StatItem(
                  label: '记忆',
                  value: memoryCount.toString(),
                ),
              ),
              Expanded(
                child: _StatItem(
                  label: '照片',
                  value: photoCount.toString(),
                ),
              ),
              Expanded(
                child: _StatItem(
                  label: '反思',
                  value: reflectionCount.toString(),
                ),
              ),
            ],
          ),
        ],
      ),
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
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

  List<int> _readIntList(dynamic value) {
    if (value is! List) {
      return <int>[];
    }

    return value.whereType<num>().map((num value) => value.toInt()).toList();
  }

  Map<String, List<int>> _readMoodTrend(dynamic value) {
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

  int _sum(List<int> values) {
    int result = 0;

    for (final int value in values) {
      result += value;
    }

    return result;
  }

  int _sumNested(Map<String, List<int>> values) {
    int result = 0;

    for (final List<int> series in values.values) {
      result += _sum(series);
    }

    return result;
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
