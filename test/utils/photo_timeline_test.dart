import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/utils/photo_timeline.dart';

void main() {
  group('照片时间线分组 与 标题 测试', () {
    test('day 分组：同一天 2 张 + 另一天 1 张 → 2 组，组间新日期在前，组内倒序', () {
      final now = DateTime(2024, 5, 20, 15, 30);
      final sameDay1 = Photo(
        id: 'p1',
        localPath: '/tmp/1.jpg',
        takenAt: DateTime(2024, 5, 20, 18, 0),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: now,
      );
      final sameDay2 = Photo(
        id: 'p2',
        localPath: '/tmp/2.jpg',
        takenAt: DateTime(2024, 5, 20, 9, 0),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: now,
      );
      final otherDay = Photo(
        id: 'p3',
        localPath: '/tmp/3.jpg',
        takenAt: DateTime(2024, 5, 19, 12, 0),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: now,
      );
      final groups =
          groupPhotos([sameDay2, otherDay, sameDay1], TimelineGranularity.day);
      expect(groups.length, 2);
      expect(groups[0].start.year, 2024);
      expect(groups[0].start.month, 5);
      expect(groups[0].start.day, 20);
      expect(groups[0].photos.first.id, 'p1');
      expect(groups[0].photos.last.id, 'p2');
    });
    test('week 分组：周一与周日同组、下周一不同组（周起始为周一）', () {
      final monday = Photo(
        id: 'monday',
        localPath: '/tmp/m1.jpg',
        takenAt: DateTime(2024, 6, 3, 10, 0),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      final sunday = Photo(
        id: 'sunday',
        localPath: '/tmp/s1.jpg',
        takenAt: DateTime(2024, 6, 9, 20, 0),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      final nextMonday = Photo(
        id: 'nextMonday',
        localPath: '/tmp/m2.jpg',
        takenAt: DateTime(2024, 6, 10, 9, 0),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      final groups =
          groupPhotos([monday, sunday, nextMonday], TimelineGranularity.week);
      expect(groups.length, 2);
      final firstGroupIds = groups[0].photos.map((p) => p.id).toList();
      final secondGroupIds = groups[1].photos.map((p) => p.id).toList();
      final allIds = {...firstGroupIds, ...secondGroupIds};
      expect(allIds.containsAll(['monday', 'sunday', 'nextMonday']), isTrue);
      final sameGroup = (firstGroupIds.contains('monday') &&
              firstGroupIds.contains('sunday')) ||
          (secondGroupIds.contains('monday') &&
              secondGroupIds.contains('sunday'));
      expect(sameGroup, isTrue);
    });
    test('month 分组：月底与月初不同组', () {
      final endOfMay = Photo(
        id: 'may31',
        localPath: '/tmp/may31.jpg',
        takenAt: DateTime(2024, 5, 31, 23, 59),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      final startOfJune = Photo(
        id: 'jun1',
        localPath: '/tmp/jun1.jpg',
        takenAt: DateTime(2024, 6, 1, 0, 1),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      final groups =
          groupPhotos([endOfMay, startOfJune], TimelineGranularity.month);
      expect(groups.length, 2);
      expect(groups[0].start.month != groups[1].start.month, isTrue);
    });
    test(
        "groupTitle：day 返回 'yyyy-MM-dd'；month 返回 'yyyy年M月'；week 返回含 '第' 与 '周' 的字符串",
        () {
      final date = DateTime(2024, 7, 15);
      final dayTitle = groupTitle(date, TimelineGranularity.day);
      final monthTitle = groupTitle(date, TimelineGranularity.month);
      final weekTitle = groupTitle(date, TimelineGranularity.week);
      expect(dayTitle, '2024-07-15');
      expect(monthTitle, contains('2024年7月'));
      expect(weekTitle, contains('第'));
      expect(weekTitle, contains('周'));
    });
    test('空列表 → 返回空组列表', () {
      final groups = groupPhotos(const <Photo>[], TimelineGranularity.day);
      expect(groups, isEmpty);
    });
  });
}
