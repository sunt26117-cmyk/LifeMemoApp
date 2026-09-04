// lib/providers/task_provider.dart
import 'package:flutter/foundation.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/repositories/task_repository.dart';
import 'package:ai_life_recorder/services/task_service.dart';
import 'package:ai_life_recorder/constants/enums.dart';

/// 排序方式
enum TaskSort { priority, createdAt }

/// 任务提供者
class TaskProvider extends ChangeNotifier {
  TaskProvider({required TaskRepository repository, TaskService? service})
      : _repository = repository,
        _service = service;

  final TaskRepository _repository;
  final TaskService? _service;

  List<Task> _tasks = [];
  TaskStatus? _filterStatus;
  TaskCategory? _filterCategory;
  TaskSort _sortBy = TaskSort.createdAt;

  List<Task> get tasks {
    var list = _tasks;
    if (_filterStatus != null) {
      list = list.where((t) => t.status == _filterStatus).toList();
    }
    if (_filterCategory != null) {
      list = list.where((t) => t.category == _filterCategory).toList();
    }
    final List<Task> result = List<Task>.from(list);
    if (_sortBy == TaskSort.priority) {
      result.sort((a, b) =>
          _priorityValue(b.priority).compareTo(_priorityValue(a.priority)));
    } else {
      result.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    }
    return result;
  }

  List<TaskStatus?> get allStatuses => <TaskStatus?>[
        null,
        TaskStatus.todo,
        TaskStatus.inProgress,
        TaskStatus.done,
        TaskStatus.delayed,
        TaskStatus.cancelled,
      ];

  int countOf(TaskStatus status) {
    return _tasks.where((t) => t.status == status).length;
  }

  TaskStatus? get filterStatus => _filterStatus;
  TaskCategory? get filterCategory => _filterCategory;
  TaskSort get sortBy => _sortBy;

  Future<void> load() async {
    final list = await _repository.listByStatus(null);
    _tasks = list;
    notifyListeners();
  }

  Future<void> refresh() async {
    await load();
  }

  Future<void> save(Task task) async {
    await _repository.upsert(task);
    await refresh();
  }

  Future<void> delete(String id) async {
    try {
      await _repository.delete(id);
      _tasks.removeWhere((t) => t.id == id);
      notifyListeners();
    } catch (e) {
      debugPrint('TaskProvider.delete error: $e');
    }
  }

  Future<Task> changeStatus(
    Task task,
    TaskStatus to, {
    DelayType? delayType,
    CancelType? cancelType,
    String? reason,
    List<String>? behaviorImprovement,
    DateTime? now,
  }) async {
    if (_service != null) {
      final updated = await _service.changeStatus(
        task,
        to,
        delayType: delayType,
        cancelType: cancelType,
        reason: reason,
        behaviorImprovement: behaviorImprovement,
        now: now,
      );
      _replaceOrAdd(updated);
      notifyListeners();
      return updated;
    } else {
      final updated = task.copyWith(status: to);
      await _repository.upsert(updated);
      _replaceOrAdd(updated);
      notifyListeners();
      return updated;
    }
  }

  void setFilterStatus(TaskStatus? status) {
    _filterStatus = status;
    notifyListeners();
  }

  void setFilterCategory(TaskCategory? category) {
    _filterCategory = category;
    notifyListeners();
  }

  void setSortBy(TaskSort sort) {
    _sortBy = sort;
    notifyListeners();
  }

  void _replaceOrAdd(Task t) {
    final idx = _tasks.indexWhere((e) => e.id == t.id);
    if (idx >= 0) {
      _tasks[idx] = t;
    } else {
      _tasks.add(t);
    }
  }

  int _priorityValue(TaskPriority p) {
    switch (p) {
      case TaskPriority.high:
        return 2;
      case TaskPriority.medium:
        return 1;
      case TaskPriority.low:
        return 0;
    }
  }
}