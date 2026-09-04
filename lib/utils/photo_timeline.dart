import 'package:intl/intl.dart';

import 'package:ai_life_recorder/models/photo.dart';

/// 时间轴粒度
enum TimelineGranularity { day, week, month }

/// 一个时间分组的照片集合
class PhotoGroup {
  final DateTime start;
  final DateTime end;
  final List<Photo> photos;

  PhotoGroup({
    required this.start,
    required this.end,
    required this.photos,
  });
}

/// 按 takenAt 分组：组内按 takenAt 倒序，组间按 start 倒序（最新组最前）
List<PhotoGroup> groupPhotos(
  List<Photo> photos,
  TimelineGranularity granularity,
) {
  final Map<int, List<Photo>> buckets = {};
  final Map<int, DateTime> bucketStarts = {};

  for (final p in photos) {
    final start = _groupStart(p.takenAt, granularity);
    final key = start.millisecondsSinceEpoch;
    bucketStarts[key] = start;
    buckets.putIfAbsent(key, () => []).add(p);
  }

  final groups = <PhotoGroup>[];
  for (final entry in buckets.entries) {
    final start = bucketStarts[entry.key]!;
    final end = _groupEnd(start, granularity);
    final list = entry.value;
    list.sort((a, b) => b.takenAt.compareTo(a.takenAt));
    groups.add(PhotoGroup(
      start: start,
      end: end,
      photos: List.unmodifiable(list),
    ));
  }
  groups.sort((a, b) => b.start.compareTo(a.start));
  return groups;
}

/// 组起始时间（UTC 0 点）
DateTime _groupStart(DateTime dt, TimelineGranularity granularity) {
  // 按本地日历分组（用户视角的日/周/月），避免 UTC 时区偏移
  switch (granularity) {
    case TimelineGranularity.day:
      return DateTime(dt.year, dt.month, dt.day);
    case TimelineGranularity.week:
      // DateTime.weekday: 1=周一 .. 7=周日
      final weekday = dt.weekday;
      final monday = dt.subtract(Duration(days: weekday - 1));
      return DateTime(monday.year, monday.month, monday.day);
    case TimelineGranularity.month:
      return DateTime(dt.year, dt.month, 1);
  }
}

/// 组结束时间（开区间）
DateTime _groupEnd(DateTime start, TimelineGranularity granularity) {
  switch (granularity) {
    case TimelineGranularity.day:
      return start.add(const Duration(days: 1));
    case TimelineGranularity.week:
      return start.add(const Duration(days: 7));
    case TimelineGranularity.month:
      final y = start.year;
      final m = start.month;
      if (m == 12) {
        return DateTime(y + 1, 1, 1);
      }
      return DateTime(y, m + 1, 1);
  }
}

/// ISO-8601 周数（周一开始）
int _isoWeekNumber(DateTime date) {
  final d = date.toUtc();
  final weekday = d.weekday;
  final thursday = d.add(Duration(days: 4 - weekday));
  final firstJan = DateTime.utc(thursday.year, 1, 1);
  final days = thursday.difference(firstJan).inDays;
  return (days / 7).floor() + 1;
}

/// 组标题
String groupTitle(DateTime start, TimelineGranularity granularity) {
  final sLocal = start.toLocal();
  switch (granularity) {
    case TimelineGranularity.day:
      return DateFormat('yyyy-MM-dd').format(sLocal);
    case TimelineGranularity.week:
      final week = _isoWeekNumber(start);
      final endOfWeek = start.add(const Duration(days: 6)).toLocal();
      return '${sLocal.year} 第$week周（${sLocal.month}月${sLocal.day}日-${endOfWeek.month}月${endOfWeek.day}日）';
    case TimelineGranularity.month:
      return '${sLocal.year}年${sLocal.month}月';
  }
}
