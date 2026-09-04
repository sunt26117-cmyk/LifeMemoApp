// lib/services/task_service.dart
// 任务状态机核心实现：校验状态转换、处理副作用并持久化
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/repositories/task_repository.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/check_in_record.dart';
import 'package:ai_life_recorder/repositories/check_in_record_repository.dart';
import 'package:ai_life_recorder/repositories/check_in_type_repository.dart';
import 'package:uuid/uuid.dart';

/// 非法转换异常
class InvalidTransitionException implements Exception {
  final String message;
  InvalidTransitionException(this.message);
  @override
  String toString() => 'InvalidTransitionException: $message';
}

/// 任务状态变更事件（用于回调）
/// 扩展字段：eventId（幂等），taskTitle，delayType，cancelType，categoryValue，behaviorImprovement
class TaskTransitionEvent {
  final String taskId;
  final String event;
  final double delta;
  final DateTime time;

  final String eventId; // uuid，幂等判重
  final String? taskTitle; // 具体行为名（trend key）
  final DelayType? delayType;
  final CancelType? cancelType;
  final String? categoryValue; // Task.category.value 中文，如 '学习'
  final List<String>? behaviorImprovement;

  TaskTransitionEvent({
    required this.taskId,
    required this.event,
    required this.delta,
    required this.time,
    required this.eventId,
    this.taskTitle,
    this.delayType,
    this.cancelType,
    this.categoryValue,
    this.behaviorImprovement,
  });
}

/// 任务服务：状态转换校验、副作用处理与持久化
class TaskService {
  TaskService({
    required TaskRepository repository,
    void Function(TaskTransitionEvent event)? onTaskEventHandler,
    CheckInTypeRepository? checkInTypeRepository,
    CheckInRecordRepository? checkInRecordRepository,
  })  : _repo = repository,
        onTaskEvent = onTaskEventHandler,
        _checkInTypeRepository = checkInTypeRepository,
        _checkInRecordRepository = checkInRecordRepository;

  final TaskRepository _repo;

  /// 事件回调（可选），T12 替换为更复杂实现
  void Function(TaskTransitionEvent event)? onTaskEvent;

  final CheckInTypeRepository? _checkInTypeRepository;
  final CheckInRecordRepository? _checkInRecordRepository;

  Future<Task> changeStatus(
    Task task,
    TaskStatus to, {
    DelayType? delayType,
    CancelType? cancelType,
    String? reason,
    List<String>? behaviorImprovement,
    DateTime? now,
  }) async {
    final DateTime tNow = now ?? DateTime.now();
    final TaskStatus from = task.status;

    if (from == TaskStatus.done || from == TaskStatus.cancelled) {
      throw InvalidTransitionException('任务已处于终态，不能再转换');
    }

    final Map<TaskStatus, Set<TaskStatus>> allowed = {
      TaskStatus.todo: {
        TaskStatus.inProgress,
        TaskStatus.done,
        TaskStatus.delayed,
        TaskStatus.cancelled,
      },
      TaskStatus.inProgress: {
        TaskStatus.done,
        TaskStatus.delayed,
        TaskStatus.cancelled,
      },
      TaskStatus.delayed: {TaskStatus.inProgress, TaskStatus.cancelled},
      TaskStatus.done: {},
      TaskStatus.cancelled: {},
    };

    if (!allowed[from]!.contains(to)) {
      throw InvalidTransitionException('非法的状态转换：$from -> $to');
    }

    final TaskFeedback oldFb = task.feedback;
    TaskFeedback newFb = oldFb;

    if (to == TaskStatus.inProgress) {
      newFb = oldFb.copyWith(actualStartTime: tNow);
    } else if (to == TaskStatus.done) {
      final DateTime completedTime = tNow;
      final DateTime? actualStart = oldFb.actualStartTime;
      final int durationMinutes = actualStart == null
          ? 0
          : completedTime.difference(actualStart).inMinutes;
      newFb = oldFb.copyWith(
        completedTime: completedTime,
        executionDurationMinutes: durationMinutes,
        behaviorImprovement: behaviorImprovement ?? oldFb.behaviorImprovement,
      );
    } else if (to == TaskStatus.delayed) {
      if (delayType == null || (reason == null || reason.isEmpty)) {
        throw ArgumentError('延期必须提供 delayType 与 reason');
      }
      newFb = oldFb.copyWith(delayType: delayType, reason: reason);
    } else if (to == TaskStatus.cancelled) {
      if (cancelType == null || (reason == null || reason.isEmpty)) {
        throw ArgumentError('取消必须提供 cancelType 与 reason');
      }
      newFb = oldFb.copyWith(cancelType: cancelType, reason: reason);
    }

    final Task updated = task.copyWith(status: to, feedback: newFb);
    await _repo.upsert(updated);

    if (to == TaskStatus.done) {
      onTaskEvent?.call(TaskTransitionEvent(
        taskId: updated.id,
        event: 'completed',
        delta: -1,
        time: tNow,
        eventId: const Uuid().v4(),
        taskTitle: updated.title,
        categoryValue: updated.category.value,
        behaviorImprovement: updated.feedback.behaviorImprovement,
      ));

      // TASK-EXT-04：任务完成时自动为关联的打卡类型生成当天记录
      await _autoCheckIn(updated, tNow);
    } else if (to == TaskStatus.delayed) {
      onTaskEvent?.call(TaskTransitionEvent(
        taskId: updated.id,
        event: 'delayed',
        delta: 0,
        time: tNow,
        eventId: const Uuid().v4(),
        taskTitle: updated.title,
        categoryValue: updated.category.value,
        delayType: delayType,
      ));
    } else if (to == TaskStatus.cancelled) {
      onTaskEvent?.call(TaskTransitionEvent(
        taskId: updated.id,
        event: 'cancelled',
        delta: 0,
        time: tNow,
        eventId: const Uuid().v4(),
        taskTitle: updated.title,
        categoryValue: updated.category.value,
        cancelType: cancelType,
      ));
    }

    return updated;
  }

  /// TASK-EXT-04：任务完成时，为任务关联的每个打卡类型生成当天记录。
  /// 手动打卡与自动打卡都走 [CheckInRecordRepository.upsert] 覆盖式去重。
  Future<void> _autoCheckIn(Task task, DateTime now) async {
    if (_checkInTypeRepository == null || _checkInRecordRepository == null) {
      return;
    }
    if (task.checkInTypeIds.isEmpty) return;

    final date = DateTime(now.year, now.month, now.day);
    for (final typeId in task.checkInTypeIds) {
      final type = await _checkInTypeRepository.getById(typeId);
      final record = CheckInRecord.create(
        id: const Uuid().v4(),
        date: date,
        typeId: typeId,
        taskId: task.id,
        symbol: type?.symbol ?? '',
        label: type?.label ?? '',
      );
      await _checkInRecordRepository.upsert(record);
    }
  }
}
