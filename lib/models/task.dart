import '../constants/enums.dart';

class TaskStep {
  final String content;
  final bool done;
  TaskStep({
    required this.content,
    this.done = false,
  });
  factory TaskStep.fromJson(Map<String, dynamic> map) {
    return TaskStep(
      content: map['content'] as String,
      done: map['done'] as bool? ?? false,
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'content': content,
      'done': done,
    };
  }

  TaskStep copyWith({
    String? content,
    bool? done,
  }) {
    return TaskStep(
      content: content ?? this.content,
      done: done ?? this.done,
    );
  }
}

class TaskFeedback {
  final DelayType? delayType;
  final CancelType? cancelType;
  final String? reason;
  final DateTime? actualStartTime;
  final DateTime? completedTime;
  final int? executionDurationMinutes;
  final List<String> behaviorImprovement;
  TaskFeedback({
    this.delayType,
    this.cancelType,
    this.reason,
    this.actualStartTime,
    this.completedTime,
    this.executionDurationMinutes,
    List<String>? behaviorImprovement,
  }) : behaviorImprovement = behaviorImprovement ?? <String>[];
  factory TaskFeedback.fromJson(Map<String, dynamic>? map) {
    if (map == null) return TaskFeedback();
    return TaskFeedback(
      delayType: map['delay_type'] == null
          ? null
          : DelayType.fromString(map['delay_type'] as String),
      cancelType: map['cancel_type'] == null
          ? null
          : CancelType.fromString(map['cancel_type'] as String),
      reason: map['reason'] as String?,
      actualStartTime: map['actual_start_time'] == null
          ? null
          : DateTime.parse(map['actual_start_time'] as String),
      completedTime: map['completed_time'] == null
          ? null
          : DateTime.parse(map['completed_time'] as String),
      executionDurationMinutes: map['execution_duration_minutes'] as int?,
      behaviorImprovement: (map['behavior_improvement'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'delay_type': delayType?.value,
      'cancel_type': cancelType?.value,
      'reason': reason,
      'actual_start_time': actualStartTime?.toUtc().toIso8601String(),
      'completed_time': completedTime?.toUtc().toIso8601String(),
      'execution_duration_minutes': executionDurationMinutes,
      'behavior_improvement': behaviorImprovement,
    };
  }

  TaskFeedback copyWith({
    DelayType? delayType,
    CancelType? cancelType,
    String? reason,
    DateTime? actualStartTime,
    DateTime? completedTime,
    int? executionDurationMinutes,
    List<String>? behaviorImprovement,
  }) {
    return TaskFeedback(
      delayType: delayType ?? this.delayType,
      cancelType: cancelType ?? this.cancelType,
      reason: reason ?? this.reason,
      actualStartTime: actualStartTime ?? this.actualStartTime,
      completedTime: completedTime ?? this.completedTime,
      executionDurationMinutes:
          executionDurationMinutes ?? this.executionDurationMinutes,
      behaviorImprovement:
          behaviorImprovement ?? List<String>.from(this.behaviorImprovement),
    );
  }
}

class Task {
  final String id;
  final String title;
  final String? description;
  final TaskCategory category;
  final TaskPriority priority;
  final DateTime? startTime;
  final DateTime? dueTime;
  final DateTime? reminderTime;
  final RepeatRule repeatRule;
  final int? estimatedMinutes;
  final TaskStatus status;
  final List<TaskStep> steps;
  final String? sourceReflectionId;
  final TaskFeedback feedback;
  final DateTime createdAt;
  final List<String> checkInTypeIds;
  Task({
    required this.id,
    required this.title,
    this.description,
    required this.category,
    required this.priority,
    this.startTime,
    this.dueTime,
    this.reminderTime,
    required this.repeatRule,
    this.estimatedMinutes,
    required this.status,
    List<TaskStep>? steps,
    this.sourceReflectionId,
    TaskFeedback? feedback,
    DateTime? createdAt,
    List<String>? checkInTypeIds,
  })  : steps = steps ?? <TaskStep>[],
        feedback = feedback ?? TaskFeedback(),
        createdAt = (createdAt ?? DateTime.now().toUtc()),
        checkInTypeIds = checkInTypeIds ?? <String>[];
  factory Task.fromJson(Map<String, dynamic> map) {
    return Task(
      id: map['id'] as String,
      title: map['title'] as String,
      description: map['description'] as String?,
      category: TaskCategory.fromString(map['category'] as String),
      priority: TaskPriority.fromString(map['priority'] as String),
      startTime: map['start_time'] == null
          ? null
          : DateTime.parse(map['start_time'] as String),
      dueTime: map['due_time'] == null
          ? null
          : DateTime.parse(map['due_time'] as String),
      reminderTime: map['reminder_time'] == null
          ? null
          : DateTime.parse(map['reminder_time'] as String),
      repeatRule: RepeatRule.fromString(map['repeat_rule'] as String),
      estimatedMinutes: map['estimated_minutes'] as int?,
      status: TaskStatus.fromString(map['status'] as String),
      steps: (map['steps'] as List<dynamic>?)
              ?.map((e) => TaskStep.fromJson(e as Map<String, dynamic>))
              .toList() ??
          <TaskStep>[],
      sourceReflectionId: map['source_reflection_id'] as String?,
      feedback: TaskFeedback.fromJson(
          (map['feedback'] as Map<String, dynamic>?) ?? <String, dynamic>{}),
      checkInTypeIds: (map['check_in_type_ids'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      createdAt: map['created_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(map['created_at'] as String),
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category.value,
      'priority': priority.value,
      'start_time': startTime?.toUtc().toIso8601String(),
      'due_time': dueTime?.toUtc().toIso8601String(),
      'reminder_time': reminderTime?.toUtc().toIso8601String(),
      'repeat_rule': repeatRule.value,
      'estimated_minutes': estimatedMinutes,
      'status': status.value,
      'steps': steps.map((s) => s.toJson()).toList(),
      'source_reflection_id': sourceReflectionId,
      'feedback': feedback.toJson(),
      'check_in_type_ids': checkInTypeIds,
      'created_at': createdAt.toUtc().toIso8601String(),
    };
  }

  Task copyWith({
    String? id,
    String? title,
    String? description,
    TaskCategory? category,
    TaskPriority? priority,
    DateTime? startTime,
    DateTime? dueTime,
    DateTime? reminderTime,
    RepeatRule? repeatRule,
    int? estimatedMinutes,
    TaskStatus? status,
    List<TaskStep>? steps,
    String? sourceReflectionId,
    TaskFeedback? feedback,
    DateTime? createdAt,
    List<String>? checkInTypeIds,
  }) {
    return Task(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category ?? this.category,
      priority: priority ?? this.priority,
      startTime: startTime ?? this.startTime,
      dueTime: dueTime ?? this.dueTime,
      reminderTime: reminderTime ?? this.reminderTime,
      repeatRule: repeatRule ?? this.repeatRule,
      estimatedMinutes: estimatedMinutes ?? this.estimatedMinutes,
      status: status ?? this.status,
      steps: steps ?? List<TaskStep>.from(this.steps),
      sourceReflectionId: sourceReflectionId ?? this.sourceReflectionId,
      feedback: feedback ?? this.feedback.copyWith(),
      createdAt: createdAt ?? this.createdAt,
      checkInTypeIds: checkInTypeIds ?? List<String>.from(this.checkInTypeIds),
    );
  }
}
