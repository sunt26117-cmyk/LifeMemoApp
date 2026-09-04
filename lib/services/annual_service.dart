import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

import 'package:ai_life_recorder/ai/summary_ai.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/models/summary.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';

class AnnualService {
  AnnualService({
    required this.repos,
    required this.summaryAi,
    required this.nowMillis,
  });

  final Repositories repos;
  final SummaryAi summaryAi;
  final int Function() nowMillis;

  static const Uuid _uuid = Uuid();
  static final DateFormat _monthFormat = DateFormat('yyyy-MM');

  Future<Map<String, dynamic>> buildChartData({
    required DateTime periodStart,
    required DateTime periodEnd,
    int topTagCount = 10,
    int maxScan = 5000,
  }) async {
    if (periodEnd.isBefore(periodStart)) {
      throw ArgumentError('periodEnd 不能早于 periodStart');
    }

    if (topTagCount < 0) {
      throw ArgumentError('topTagCount 不能小于 0');
    }

    if (maxScan < 0) {
      throw ArgumentError('maxScan 不能小于 0');
    }

    final List<DateTime> monthBuckets = _buildMonthBuckets(
      periodStart: periodStart,
      periodEnd: periodEnd,
    );

    final List<String> months =
        monthBuckets.map(_monthFormat.format).toList(growable: false);

    final Map<String, int> monthIndex = <String, int>{
      for (int i = 0; i < months.length; i++) months[i]: i,
    };

    final List<Memory> memories = await repos.memories.list(
      from: periodStart,
      to: periodEnd,
    );

    final List<Photo> photos = await repos.photos.listByRange(
      periodStart,
      periodEnd,
    );

    final List<Reflection> reflections = await repos.reflections.list(
      from: periodStart,
      to: periodEnd,
    );

    final int totalScanned =
        memories.length + photos.length + reflections.length;

    final bool truncated = totalScanned > maxScan;

    final List<int> memoryTrend = List<int>.filled(months.length, 0);
    final List<int> photoTrend = List<int>.filled(months.length, 0);

    final Map<String, List<int>> moodTrend = <String, List<int>>{
      for (final Emotion emotion in Emotion.values)
        emotion.value: List<int>.filled(months.length, 0),
    };

    final Map<String, int> tagTotals = <String, int>{};

    void incrementTagTotal(String rawTag) {
      final String tag = rawTag.trim();
      if (tag.isEmpty) {
        return;
      }
      tagTotals[tag] = (tagTotals[tag] ?? 0) + 1;
    }

    int monthIndexOf(DateTime value) {
      final String key = _monthFormat.format(value.toLocal());
      return monthIndex[key] ?? -1;
    }

    for (final Memory memory in memories) {
      if (!_isWithinPeriod(
        memory.createdAt,
        periodStart,
        periodEnd,
      )) {
        continue;
      }

      final int index = monthIndexOf(memory.createdAt);
      if (index >= 0 && index < memoryTrend.length) {
        memoryTrend[index]++;
      }

      for (final String tag in memory.tags) {
        incrementTagTotal(tag);
      }
    }

    for (final Photo photo in photos) {
      if (!_isWithinPeriod(
        photo.takenAt,
        periodStart,
        periodEnd,
      )) {
        continue;
      }

      final int index = monthIndexOf(photo.takenAt);
      if (index >= 0 && index < photoTrend.length) {
        photoTrend[index]++;
      }

      for (final String tag in photo.tags) {
        incrementTagTotal(tag);
      }
    }

    for (final Reflection reflection in reflections) {
      if (!_isWithinPeriod(
        reflection.createdAt,
        periodStart,
        periodEnd,
      )) {
        continue;
      }

      final int index = monthIndexOf(reflection.createdAt);
      if (index < 0 || index >= months.length) {
        continue;
      }

      final String emotionKey = _normalizeEmotion(reflection.emotion);

      moodTrend[emotionKey]![index]++;
    }

    final List<String> selectedTags = tagTotals.keys.toList()
      ..sort((String a, String b) {
        final int frequencyCompare =
            (tagTotals[b] ?? 0).compareTo(tagTotals[a] ?? 0);

        if (frequencyCompare != 0) {
          return frequencyCompare;
        }

        return a.compareTo(b);
      });

    final List<String> topTags =
        selectedTags.take(topTagCount).toList(growable: false);

    final Map<String, List<int>> tagTrend = <String, List<int>>{
      for (final String tag in topTags) tag: List<int>.filled(months.length, 0),
    };

    for (final Memory memory in memories) {
      if (!_isWithinPeriod(
        memory.createdAt,
        periodStart,
        periodEnd,
      )) {
        continue;
      }

      final int index = monthIndexOf(memory.createdAt);
      if (index < 0 || index >= months.length) {
        continue;
      }

      for (final String rawTag in memory.tags) {
        final String tag = rawTag.trim();
        if (tagTrend.containsKey(tag)) {
          tagTrend[tag]![index]++;
        }
      }
    }

    for (final Photo photo in photos) {
      if (!_isWithinPeriod(
        photo.takenAt,
        periodStart,
        periodEnd,
      )) {
        continue;
      }

      final int index = monthIndexOf(photo.takenAt);
      if (index < 0 || index >= months.length) {
        continue;
      }

      for (final String rawTag in photo.tags) {
        final String tag = rawTag.trim();
        if (tagTrend.containsKey(tag)) {
          tagTrend[tag]![index]++;
        }
      }
    }

    return <String, dynamic>{
      'months': months,
      'memoryTrend': memoryTrend,
      'photoTrend': photoTrend,
      'moodTrend': moodTrend,
      'tagTrend': tagTrend,
      'truncated': truncated,
    };
  }

  Future<Summary> generateAnnualSummary({
    required DateTime periodStart,
    required DateTime periodEnd,
    bool persist = true,
  }) async {
    final Map<String, dynamic> chartData = await buildChartData(
      periodStart: periodStart,
      periodEnd: periodEnd,
    );

    final Map<String, dynamic> aggregate = <String, dynamic>{
      'chartData': chartData,
      'periodStart': periodStart.toIso8601String(),
      'periodEnd': periodEnd.toIso8601String(),
    };

    final Map<String, dynamic> aiResult = await summaryAi.generate(
      type: SummaryType.yearly,
      aggregate: aggregate,
    );

    final String annualTheme = _readString(
      aiResult['annualTheme'],
    );

    final String annualReflection = _readString(
      aiResult['annualReflection'],
    );

    final List<String>? themes =
        annualTheme.isEmpty ? null : <String>[annualTheme];

    final List<String>? highlights = _readStringList(
      aiResult['highlights'],
    );

    final List<String>? nextYearSuggestions = _readStringList(
      aiResult['nextYearSuggestions'],
    );

    // 同年度已有总结则复用其 id：persist 时 upsert 覆盖而非新增，避免历史重复
    Summary? existing;
    if (persist) {
      existing =
          await repos.summaries.getByPeriod(SummaryType.yearly, periodStart);
    }

    final Summary summary = Summary(
      id: existing?.id ?? _uuid.v4(),
      type: SummaryType.yearly,
      periodStart: periodStart.toUtc(),
      periodEnd: periodEnd.toUtc(),
      content: annualReflection,
      themes: themes,
      trends: Map<String, dynamic>.from(aiResult),
      highlights: highlights,
      taskSuggestions: nextYearSuggestions,
      chartData: <String, dynamic>{
        'annual': chartData,
      },
      createdAt: DateTime.fromMillisecondsSinceEpoch(
        nowMillis(),
      ).toUtc(),
    );

    if (persist) {
      await repos.summaries.upsert(summary);
    }

    return summary;
  }

  List<DateTime> _buildMonthBuckets({
    required DateTime periodStart,
    required DateTime periodEnd,
  }) {
    final DateTime firstMonth = DateTime(
      periodStart.toLocal().year,
      periodStart.toLocal().month,
    );

    final DateTime lastMonth = DateTime(
      periodEnd.toLocal().year,
      periodEnd.toLocal().month,
    );

    final List<DateTime> result = <DateTime>[];

    DateTime cursor = firstMonth;

    while (!cursor.isAfter(lastMonth)) {
      result.add(cursor);
      cursor = DateTime(
        cursor.year,
        cursor.month + 1,
      );
    }

    return result;
  }

  bool _isWithinPeriod(
    DateTime value,
    DateTime start,
    DateTime end,
  ) {
    final DateTime target = value.toUtc();
    final DateTime startUtc = start.toUtc();
    final DateTime endUtc = end.toUtc();

    return !target.isBefore(startUtc) && !target.isAfter(endUtc);
  }

  String _normalizeEmotion(String? rawEmotion) {
    final String value = rawEmotion?.trim() ?? '';

    for (final Emotion emotion in Emotion.values) {
      if (emotion.value == value) {
        return value;
      }
    }

    return Emotion.other.value;
  }

  String _readString(dynamic value) {
    if (value is! String) {
      return '';
    }

    return value.trim();
  }

  List<String>? _readStringList(dynamic value) {
    if (value is! List) {
      return null;
    }

    final List<String> result = <String>[];

    for (final dynamic item in value) {
      if (item is! String) {
        continue;
      }

      final String text = item.trim();
      if (text.isEmpty) {
        continue;
      }

      result.add(text);
    }

    return result;
  }
}
