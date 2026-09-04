import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/models/summary.dart';

class TimelineSection extends StatelessWidget {
  const TimelineSection({
    super.key,
    required this.summary,
    required this.animate,
  });

  final Summary summary;
  final bool animate;

  @override
  Widget build(BuildContext context) {
    final List<String> highlights = _buildHighlights();

    final Widget content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Text(
          '亮点时间线',
          style: TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 14),
        for (int index = 0; index < highlights.length; index++)
          _TimelineItem(
            text: highlights[index],
            isLast: index == highlights.length - 1,
            animate: animate,
            index: index,
          ),
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

  List<String> _buildHighlights() {
    final List<String> original = summary.highlights
        .where(
          (String item) => item.trim().isNotEmpty,
        )
        .map((String item) => item.trim())
        .toList();

    if (original.isNotEmpty) {
      return original;
    }

    final Map<String, dynamic>? annual =
        summary.chartData['annual'] as Map<String, dynamic>?;

    final List<int> memoryTrend = _readIntList(annual?['memoryTrend']);

    final List<int> photoTrend = _readIntList(annual?['photoTrend']);

    final Map<String, List<int>> moodTrend =
        _readSeriesMap(annual?['moodTrend']);

    final int memoryCount = _sum(memoryTrend);
    final int photoCount = _sum(photoTrend);
    final int reflectionCount = _sumNested(moodTrend);

    if (memoryCount == 0 && photoCount == 0 && reflectionCount == 0) {
      return <String>[
        '这一年还没有形成足够的记录亮点。',
      ];
    }

    final List<String> result = <String>[];

    if (memoryCount > 0) {
      result.add(
        '这一年记录了 $memoryCount 条记忆。',
      );
    }

    if (photoCount > 0) {
      result.add(
        '这一年保存了 $photoCount 张照片。',
      );
    }

    if (reflectionCount > 0) {
      result.add(
        '这一年完成了 $reflectionCount 次反思记录。',
      );
    }

    return result;
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

  int _sum(List<int> values) {
    int result = 0;

    for (final int value in values) {
      result += value;
    }

    return result;
  }

  int _sumNested(
    Map<String, List<int>> values,
  ) {
    int result = 0;

    for (final List<int> series in values.values) {
      result += _sum(series);
    }

    return result;
  }
}

class _TimelineItem extends StatelessWidget {
  const _TimelineItem({
    required this.text,
    required this.isLast,
    required this.animate,
    required this.index,
  });

  final String text;
  final bool isLast;
  final bool animate;
  final int index;

  @override
  Widget build(BuildContext context) {
    final Widget card = Container(
      width: double.infinity,
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x10000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 14,
          height: 1.6,
        ),
      ),
    );

    final Widget animatedCard = !animate
        ? card
        : card
            .animate(
              delay: Duration(
                milliseconds: 50 * index,
              ),
            )
            .slideX(
              begin: 0.1,
              duration: const Duration(
                milliseconds: 300,
              ),
              curve: Curves.decelerate,
            );

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          SizedBox(
            width: 24,
            child: Column(
              children: <Widget>[
                Container(
                  width: 12,
                  height: 12,
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: AnimatedContainer(
                      duration: const Duration(
                        milliseconds: 300,
                      ),
                      width: 2,
                      color: AppColors.primary.withOpacity(0.25),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(
                bottom: 12,
              ),
              child: animatedCard,
            ),
          ),
        ],
      ),
    );
  }
}
