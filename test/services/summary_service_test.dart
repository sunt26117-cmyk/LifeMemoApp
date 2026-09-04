// test/services/summary_service_test.dart
// T11 聚合单测：截断、数量统计、category 计数、照片过滤、落库验证
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:ai_life_recorder/ai/summary_ai.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/services/summary_service.dart';

class MockSummaryAi extends Mock implements SummaryAi {}

void main() {
  group('SummaryService', () {
    late Repositories repos;
    late MockSummaryAi summaryAi;
    late DateTime fixedNow;

    setUpAll(() {
      registerFallbackValue(SummaryType.weekly);
    });

    setUp(() {
      repos = Repositories.inMemory();
      summaryAi = MockSummaryAi();
      fixedNow = DateTime(2026, 8, 31, 19, 49);

      when(
        () => summaryAi.generate(
          type: any(named: 'type'),
          aggregate: any(named: 'aggregate'),
        ),
      ).thenAnswer(
        (_) async => <String, dynamic>{
          'content': '本周期总结',
          'themes': <String>['工作', '学习'],
          'highlights': <String>['完成重要事项'],
          'taskSuggestions': <String>['安排下一周重点任务'],
        },
      );
    });

    SummaryService createService() {
      return SummaryService(
        repos: repos,
        summaryAi: summaryAi,
        nowMillis: () => fixedNow.millisecondsSinceEpoch,
      );
    }

    test('generateWeekly 使用固定 now 并成功落库', () async {
      final service = createService();

      final summary = await service.generateWeekly();

      expect(summary.type, SummaryType.weekly);
      expect(
        summary.periodStart,
        fixedNow.subtract(const Duration(days: 7)).toUtc(),
      );
      expect(summary.periodEnd, fixedNow.toUtc());
      expect(summary.content, '本周期总结');
      expect(summary.themes, <String>['工作', '学习']);
      expect(summary.highlights, <String>['完成重要事项']);
      expect(
        summary.taskSuggestions,
        <String>['安排下一周重点任务'],
      );

      final saved = await repos.summaries.listAll();
      expect(saved.length, 1);
      expect(saved.single.type, SummaryType.weekly);
      expect(saved.single.periodStart, summary.periodStart);
    });

    test('generateMonthly 使用最近 30 天周期', () async {
      final service = createService();

      final summary = await service.generateMonthly();

      expect(summary.type, SummaryType.monthly);
      expect(
        summary.periodStart,
        fixedNow.subtract(const Duration(days: 30)).toUtc(),
      );
      expect(summary.periodEnd, fixedNow.toUtc());
    });

    test('SummaryAi 会收到规定的 aggregate 键和值', () async {
      final service = createService();

      await service.generateWeekly();

      final captured = verify(
        () => summaryAi.generate(
          type: SummaryType.weekly,
          aggregate: captureAny(named: 'aggregate'),
        ),
      ).captured.single;

      final aggregate = captured as Map<String, dynamic>;

      expect(aggregate['type'], SummaryType.weekly.value);
      expect(
        aggregate['periodStart'],
        fixedNow.subtract(const Duration(days: 7)).toUtc().toIso8601String(),
      );
      expect(
        aggregate['periodEnd'],
        fixedNow.toUtc().toIso8601String(),
      );

      expect(aggregate.containsKey('memoryCount'), isTrue);
      expect(aggregate.containsKey('memories'), isTrue);
      expect(aggregate.containsKey('photoCount'), isTrue);
      expect(aggregate.containsKey('photos'), isTrue);
      expect(aggregate.containsKey('taskStats'), isTrue);
      expect(aggregate.containsKey('taskByCategory'), isTrue);

      final taskStats = aggregate['taskStats'] as Map<String, dynamic>;
      expect(taskStats.containsKey('done'), isTrue);
      expect(taskStats.containsKey('delayed'), isTrue);
      expect(taskStats.containsKey('cancelled'), isTrue);
      expect(taskStats.containsKey('total'), isTrue);
    });

    test('35 条记忆中，传给 AI 的 memories 最多 30 条，memoryCount 保留实际数量', () async {
      final now = fixedNow;
      for (int i = 0; i < 35; i++) {
        await repos.memories.upsert(Memory(
          id: 'm${i.toString().padLeft(2, '0')}',
          title: '记忆$i',
          content: '内容$i',
          tags: const ['工作'],
          aiSummary: 'AI摘要$i',
          createdAt: now.subtract(Duration(hours: i)),
        ));
      }

      final service = createService();
      await service.generateWeekly();

      final captured = verify(
        () => summaryAi.generate(
          type: SummaryType.weekly,
          aggregate: captureAny(named: 'aggregate'),
        ),
      ).captured.single;
      final aggregate = captured as Map<String, dynamic>;

      expect(aggregate['memoryCount'], 35);
      expect((aggregate['memories'] as List).length, lessThanOrEqualTo(30));
    });

    test('照片聚合只使用 summaryConfirmed 且 aiSummary 非空的照片', () async {
      final now = fixedNow;
      await repos.photos.upsert(Photo(
        id: 'p1',
        localPath: '/p1.jpg',
        takenAt: now,
        aiSummary: '已确认摘要',
        summaryConfirmed: true,
      ));
      await repos.photos.upsert(Photo(
        id: 'p2',
        localPath: '/p2.jpg',
        takenAt: now,
        aiSummary: '未确认摘要',
        summaryConfirmed: false,
      ));
      await repos.photos.upsert(Photo(
        id: 'p3',
        localPath: '/p3.jpg',
        takenAt: now,
        aiSummary: null,
        summaryConfirmed: true,
      ));

      final service = createService();
      await service.generateWeekly();

      final captured = verify(
        () => summaryAi.generate(
          type: SummaryType.weekly,
          aggregate: captureAny(named: 'aggregate'),
        ),
      ).captured.single;
      final aggregate = captured as Map<String, dynamic>;

      expect(aggregate['photoCount'], 1);
      expect(aggregate['photos'], <String>['已确认摘要']);
    });

    test('任务统计：5 done、2 delayed、3 cancelled、total 10', () async {
      final now = fixedNow;
      for (int i = 0; i < 10; i++) {
        final TaskStatus status;
        if (i < 5) {
          status = TaskStatus.done;
        } else if (i < 7) {
          status = TaskStatus.delayed;
        } else {
          status = TaskStatus.cancelled;
        }
        await repos.tasks.upsert(Task(
          id: 't$i',
          title: '任务$i',
          category: TaskCategory.planning,
          priority: TaskPriority.medium,
          repeatRule: RepeatRule.none,
          status: status,
          feedback: status == TaskStatus.done
              ? TaskFeedback(completedTime: now)
              : TaskFeedback(),
          createdAt: now,
        ));
      }

      final service = createService();
      await service.generateWeekly();

      final captured = verify(
        () => summaryAi.generate(
          type: SummaryType.weekly,
          aggregate: captureAny(named: 'aggregate'),
        ),
      ).captured.single;
      final aggregate = captured as Map<String, dynamic>;
      final taskStats = aggregate['taskStats'] as Map<String, dynamic>;

      expect(taskStats['done'], 5);
      expect(taskStats['delayed'], 2);
      expect(taskStats['cancelled'], 3);
      expect(taskStats['total'], 10);
    });

    test('TaskCategory 统计正确', () async {
      final now = fixedNow;
      await repos.tasks.upsert(Task(
        id: 't1',
        title: '学习任务',
        category: TaskCategory.learning,
        priority: TaskPriority.high,
        repeatRule: RepeatRule.none,
        status: TaskStatus.todo,
        createdAt: now,
      ));
      await repos.tasks.upsert(Task(
        id: 't2',
        title: '健康任务',
        category: TaskCategory.health,
        priority: TaskPriority.medium,
        repeatRule: RepeatRule.none,
        status: TaskStatus.todo,
        createdAt: now,
      ));
      await repos.tasks.upsert(Task(
        id: 't3',
        title: '学习任务2',
        category: TaskCategory.learning,
        priority: TaskPriority.low,
        repeatRule: RepeatRule.none,
        status: TaskStatus.todo,
        createdAt: now,
      ));

      final service = createService();
      await service.generateWeekly();

      final captured = verify(
        () => summaryAi.generate(
          type: SummaryType.weekly,
          aggregate: captureAny(named: 'aggregate'),
        ),
      ).captured.single;
      final aggregate = captured as Map<String, dynamic>;
      final taskByCategory =
          aggregate['taskByCategory'] as Map<String, dynamic>;

      expect(taskByCategory[TaskCategory.learning.value], 2);
      expect(taskByCategory[TaskCategory.health.value], 1);
      expect(taskByCategory[TaskCategory.communication.value], 0);
    });

    test('Summary 会保存 trends 和 chartData', () async {
      final service = createService();

      final summary = await service.generateWeekly();

      expect(summary.trends, isA<Map<String, dynamic>>());
      expect(
        summary.trends['taskByCategory'],
        isA<Map<String, dynamic>>(),
      );

      expect(summary.chartData, isA<Map<String, dynamic>>());
      expect(
        summary.chartData['memoryByDay'],
        isA<Map<String, dynamic>>(),
      );
      expect(
        summary.chartData['photoByDay'],
        isA<Map<String, dynamic>>(),
      );
    });
  });
}
