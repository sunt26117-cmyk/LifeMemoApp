import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/repositories/task_repository.dart';
import 'package:ai_life_recorder/services/task_service.dart';

void main() {
  group('TaskService 状态机测试', () {
    late Repositories repos;
    late TaskService service;
    late TaskRepository repo;

    setUp(() {
      repos = Repositories.inMemory();
      repo = repos.tasks;
      service = TaskService(repository: repo);
    });

    Task makeTask(String id, TaskStatus status) {
      return Task(
        id: id,
        title: '任务 $id',
        category: TaskCategory.values.first,
        priority: TaskPriority.values.first,
        repeatRule: RepeatRule.none,
        status: status,
        createdAt: DateTime.now(),
        feedback: TaskFeedback(),
      );
    }

    test('未开始→进行中：feedback.actualStartTime 被记录', () async {
      final t = makeTask('t1', TaskStatus.todo);
      await repo.upsert(t);
      final now = DateTime(2024, 1, 1, 9, 0);
      final updated =
          await service.changeStatus(t, TaskStatus.inProgress, now: now);
      expect(updated.status, TaskStatus.inProgress);
      expect(updated.feedback.actualStartTime, equals(now));
    });

    test('未开始→已完成：completedTime 记录、executionDurationMinutes 计算', () async {
      final t = makeTask('t2', TaskStatus.todo);
      final started = t.copyWith(
          feedback: t.feedback
              .copyWith(actualStartTime: DateTime(2024, 1, 1, 8, 30)));
      await repo.upsert(started);
      final now = DateTime(2024, 1, 1, 9, 15);
      final updated = await service.changeStatus(started, TaskStatus.done,
          now: now, behaviorImprovement: ['更好沟通']);
      expect(updated.status, TaskStatus.done);
      expect(updated.feedback.completedTime, equals(now));
      expect(updated.feedback.executionDurationMinutes, equals(45));
      expect(updated.feedback.behaviorImprovement, contains('更好沟通'));
    });

    test('未开始→延期：delayType+reason 必填，缺任一抛 ArgumentError', () async {
      final t = makeTask('t3', TaskStatus.todo);
      await repo.upsert(t);
      await expectLater(
          () => service.changeStatus(t, TaskStatus.delayed,
              delayType: DelayType.external, now: DateTime.now()),
          throwsA(isA<ArgumentError>()));
      await expectLater(
          () => service.changeStatus(t, TaskStatus.delayed,
              reason: '外部原因', now: DateTime.now()),
          throwsA(isA<ArgumentError>()));
      final updated = await service.changeStatus(t, TaskStatus.delayed,
          delayType: DelayType.external, reason: '外部原因', now: DateTime.now());
      expect(updated.status, TaskStatus.delayed);
      expect(updated.feedback.delayType, DelayType.external);
      expect(updated.feedback.reason, '外部原因');
    });

    test('未开始→取消：cancelType+reason 必填', () async {
      final t = makeTask('t4', TaskStatus.todo);
      await repo.upsert(t);
      await expectLater(
          () => service.changeStatus(t, TaskStatus.cancelled,
              cancelType: CancelType.active, now: DateTime.now()),
          throwsA(isA<ArgumentError>()));
      await expectLater(
          () => service.changeStatus(t, TaskStatus.cancelled,
              reason: '放弃', now: DateTime.now()),
          throwsA(isA<ArgumentError>()));
      final updated = await service.changeStatus(t, TaskStatus.cancelled,
          cancelType: CancelType.active, reason: '放弃', now: DateTime.now());
      expect(updated.status, TaskStatus.cancelled);
      expect(updated.feedback.cancelType, CancelType.active);
      expect(updated.feedback.reason, '放弃');
    });

    test('进行中→已完成：合法', () async {
      final t = makeTask('t5', TaskStatus.inProgress);
      final started = t.copyWith(
          feedback: t.feedback
              .copyWith(actualStartTime: DateTime(2024, 1, 1, 10, 0)));
      await repo.upsert(started);
      final now = DateTime(2024, 1, 1, 11, 0);
      final updated =
          await service.changeStatus(started, TaskStatus.done, now: now);
      expect(updated.status, TaskStatus.done);
      expect(updated.feedback.completedTime, equals(now));
    });

    test('进行中→延期：合法且记录 delay', () async {
      final t = makeTask('t6', TaskStatus.inProgress);
      await repo.upsert(t);
      final updated = await service.changeStatus(t, TaskStatus.delayed,
          delayType: DelayType.internal, reason: '需要更多信息', now: DateTime.now());
      expect(updated.status, TaskStatus.delayed);
      expect(updated.feedback.delayType, DelayType.internal);
      expect(updated.feedback.reason, '需要更多信息');
    });

    test('延期→进行中：合法（恢复）', () async {
      final t = makeTask('t7', TaskStatus.delayed);
      await repo.upsert(t);
      final updated = await service.changeStatus(t, TaskStatus.inProgress,
          now: DateTime.now());
      expect(updated.status, TaskStatus.inProgress);
      expect(updated.feedback.actualStartTime, isNotNull);
    });

    test('延期→取消：合法', () async {
      final t = makeTask('t8', TaskStatus.delayed);
      await repo.upsert(t);
      final updated = await service.changeStatus(t, TaskStatus.cancelled,
          cancelType: CancelType.passive, reason: '不再需要', now: DateTime.now());
      expect(updated.status, TaskStatus.cancelled);
      expect(updated.feedback.cancelType, CancelType.passive);
    });

    test('非法转换抛 InvalidTransitionException', () async {
      final done = makeTask('t9', TaskStatus.done);
      final cancelled = makeTask('t10', TaskStatus.cancelled);
      await repo.upsert(done);
      await repo.upsert(cancelled);
      await expectLater(
          () => service.changeStatus(done, TaskStatus.inProgress,
              now: DateTime.now()),
          throwsA(isA<InvalidTransitionException>()));
      await expectLater(
          () => service.changeStatus(cancelled, TaskStatus.todo,
              now: DateTime.now()),
          throwsA(isA<InvalidTransitionException>()));
      await expectLater(
          () => service.changeStatus(done, TaskStatus.delayed,
              delayType: DelayType.external, reason: 'x', now: DateTime.now()),
          throwsA(isA<InvalidTransitionException>()));
    });

    test('终态后再转换一律抛 InvalidTransitionException', () async {
      final done = makeTask('t11', TaskStatus.done);
      await repo.upsert(done);
      await expectLater(
          () => service.changeStatus(done, TaskStatus.cancelled,
              now: DateTime.now()),
          throwsA(isA<InvalidTransitionException>()));
    });

    test('onTaskEvent 在完成时被调用且 delta=-1', () async {
      final t = makeTask('t12', TaskStatus.inProgress);
      final started = t.copyWith(
          feedback:
              t.feedback.copyWith(actualStartTime: DateTime(2024, 1, 1, 8, 0)));
      await repo.upsert(started);
      TaskTransitionEvent? captured;
      service.onTaskEvent = (e) {
        captured = e;
      };
      final now = DateTime(2024, 1, 1, 9, 0);
      await service.changeStatus(started, TaskStatus.done, now: now);
      expect(captured, isNotNull);
      expect(captured!.delta, equals(-1));
      expect(captured!.event, equals('completed'));
    });

    test('behaviorImprovement 在完成时写入', () async {
      final t = makeTask('t13', TaskStatus.inProgress);
      final started = t.copyWith(
          feedback:
              t.feedback.copyWith(actualStartTime: DateTime(2024, 1, 1, 8, 0)));
      await repo.upsert(started);
      final updated = await service.changeStatus(started, TaskStatus.done,
          now: DateTime(2024, 1, 1, 9, 0), behaviorImprovement: ['更主动沟通']);
      expect(updated.feedback.behaviorImprovement, contains('更主动沟通'));
    });
  });
}
