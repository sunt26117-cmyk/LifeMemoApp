import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/models/check_in_record.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/services/task_service.dart';

void main() {
  group('TaskService 自动打卡（TASK-EXT-04）', () {
    late Repositories repos;
    late TaskService service;

    setUp(() async {
      repos = Repositories.inMemory();
      await repos.checkInTypes.seedDefaults();
      service = TaskService(
        repository: repos.tasks,
        checkInTypeRepository: repos.checkInTypes,
        checkInRecordRepository: repos.checkInRecords,
      );
    });

    Task makeTask(String id, List<String> typeIds, TaskStatus status) {
      return Task(
        id: id,
        title: '任务 $id',
        category: TaskCategory.learning,
        priority: TaskPriority.medium,
        repeatRule: RepeatRule.none,
        status: status,
        checkInTypeIds: typeIds,
        createdAt: DateTime.now(),
      );
    }

    test('完成关联打卡类型的任务 → 当天生成 CheckInRecord(taskId=该任务)', () async {
      final type = (await repos.checkInTypes.listEnabled()).first;
      final task = makeTask('task-1', [type.id], TaskStatus.todo);
      await repos.tasks.upsert(task);
      final now = DateTime(2024, 5, 6, 10, 0);
      await service.changeStatus(task, TaskStatus.done, now: now);

      final records = await repos.checkInRecords.listByDate(DateTime(2024, 5, 6));
      expect(records, hasLength(1));
      expect(records.first.typeId, type.id);
      expect(records.first.taskId, 'task-1');
      expect(records.first.symbolSnapshot, type.symbol);
      expect(records.first.labelSnapshot, type.label);
    });

    test('任务完成自动打卡与手动打卡同 (date,typeId) 覆盖式去重', () async {
      final type = (await repos.checkInTypes.listEnabled()).first;
      final task = makeTask('task-2', [type.id], TaskStatus.todo);
      await repos.tasks.upsert(task);
      // 手动先打
      await repos.checkInRecords.upsert(CheckInRecord.create(
        id: 'manual-1',
        date: DateTime(2024, 5, 6),
        typeId: type.id,
        symbol: type.symbol,
        label: type.label,
      ));
      // 任务完成自动打卡（同 typeId 同天）
      await service.changeStatus(task, TaskStatus.done, now: DateTime(2024, 5, 6, 10, 0));
      final records = await repos.checkInRecords.listByDate(DateTime(2024, 5, 6));
      expect(records, hasLength(1));
      expect(records.first.taskId, 'task-2');
    });

    test('未关联打卡类型的任务完成 → 不生成任何记录', () async {
      final task = makeTask('task-3', [], TaskStatus.todo);
      await repos.tasks.upsert(task);
      await service.changeStatus(task, TaskStatus.done, now: DateTime(2024, 5, 6));
      expect(await repos.checkInRecords.listByDate(DateTime(2024, 5, 6)), isEmpty);
    });

    test('删除任务不级联删除历史打卡记录（taskId 保留，无外键）', () async {
      final type = (await repos.checkInTypes.listEnabled()).first;
      final task = makeTask('task-4', [type.id], TaskStatus.todo);
      await repos.tasks.upsert(task);
      await service.changeStatus(task, TaskStatus.done, now: DateTime(2024, 5, 6));
      await repos.tasks.delete('task-4');
      final records = await repos.checkInRecords.listByDate(DateTime(2024, 5, 6));
      expect(records, hasLength(1));
      expect(records.first.taskId, 'task-4');
    });
  });
}