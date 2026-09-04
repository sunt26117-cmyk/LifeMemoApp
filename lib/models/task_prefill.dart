import '../constants/enums.dart';

class TaskPrefill {
  final String title;
  final String description;
  final String sourceReflectionId;
  final TaskCategory defaultCategory;
  TaskPrefill({
    required this.title,
    required this.description,
    required this.sourceReflectionId,
    required this.defaultCategory,
  });
  factory TaskPrefill.fromJson(Map<String, dynamic> map) {
    return TaskPrefill(
      title: map['title'] as String,
      description: map['description'] as String,
      sourceReflectionId: map['source_reflection_id'] as String,
      defaultCategory:
          TaskCategory.fromString(map['default_category'] as String),
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'source_reflection_id': sourceReflectionId,
      'default_category': defaultCategory.value,
    };
  }

  TaskPrefill copyWith({
    String? title,
    String? description,
    String? sourceReflectionId,
    TaskCategory? defaultCategory,
  }) {
    return TaskPrefill(
      title: title ?? this.title,
      description: description ?? this.description,
      sourceReflectionId: sourceReflectionId ?? this.sourceReflectionId,
      defaultCategory: defaultCategory ?? this.defaultCategory,
    );
  }
}
