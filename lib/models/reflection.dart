class Reflection {
  final String id;
  final String eventDescription;
  final String? emotion;
  final String? actionTaken;
  final String? result;
  final Map<String, dynamic>? aiSummary;
  final List<String> relatedMemoryIds;
  final List<String> relatedPhotoIds;
  final List<String> relatedTaskIds;
  final List<String> relatedSummaryIds;
  final bool isUserConfirmed;
  final DateTime createdAt;
  Reflection({
    required this.id,
    required this.eventDescription,
    this.emotion,
    this.actionTaken,
    this.result,
    Map<String, dynamic>? aiSummary,
    List<String>? relatedMemoryIds,
    List<String>? relatedPhotoIds,
    List<String>? relatedTaskIds,
    List<String>? relatedSummaryIds,
    this.isUserConfirmed = false,
    DateTime? createdAt,
  })  : aiSummary =
            aiSummary == null ? null : Map<String, dynamic>.from(aiSummary),
        relatedMemoryIds = relatedMemoryIds ?? <String>[],
        relatedPhotoIds = relatedPhotoIds ?? <String>[],
        relatedTaskIds = relatedTaskIds ?? <String>[],
        relatedSummaryIds = relatedSummaryIds ?? <String>[],
        createdAt = (createdAt ?? DateTime.now().toUtc());
  factory Reflection.fromJson(Map<String, dynamic> map) {
    return Reflection(
      id: map['id'] as String,
      eventDescription: map['event_description'] as String,
      emotion: map['emotion'] as String?,
      actionTaken: map['action_taken'] as String?,
      result: map['result'] as String?,
      aiSummary: (map['ai_summary'] as Map<String, dynamic>?) == null
          ? null
          : Map<String, dynamic>.from(
              map['ai_summary'] as Map<String, dynamic>),
      relatedMemoryIds: (map['related_memory_ids'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      relatedPhotoIds: (map['related_photo_ids'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      relatedTaskIds: (map['related_task_ids'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      relatedSummaryIds: (map['related_summary_ids'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      isUserConfirmed: map['is_user_confirmed'] as bool? ?? false,
      createdAt: map['created_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(map['created_at'] as String),
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'event_description': eventDescription,
      'emotion': emotion,
      'action_taken': actionTaken,
      'result': result,
      'ai_summary': aiSummary ?? <String, dynamic>{},
      'related_memory_ids': relatedMemoryIds,
      'related_photo_ids': relatedPhotoIds,
      'related_task_ids': relatedTaskIds,
      'related_summary_ids': relatedSummaryIds,
      'is_user_confirmed': isUserConfirmed,
      'created_at': createdAt.toUtc().toIso8601String(),
    };
  }

  Reflection copyWith({
    String? id,
    String? eventDescription,
    String? emotion,
    String? actionTaken,
    String? result,
    Map<String, dynamic>? aiSummary,
    List<String>? relatedMemoryIds,
    List<String>? relatedPhotoIds,
    List<String>? relatedTaskIds,
    List<String>? relatedSummaryIds,
    bool? isUserConfirmed,
    DateTime? createdAt,
  }) {
    return Reflection(
      id: id ?? this.id,
      eventDescription: eventDescription ?? this.eventDescription,
      emotion: emotion ?? this.emotion,
      actionTaken: actionTaken ?? this.actionTaken,
      result: result ?? this.result,
      aiSummary: aiSummary ??
          (this.aiSummary == null
              ? null
              : Map<String, dynamic>.from(this.aiSummary!)),
      relatedMemoryIds:
          relatedMemoryIds ?? List<String>.from(this.relatedMemoryIds),
      relatedPhotoIds:
          relatedPhotoIds ?? List<String>.from(this.relatedPhotoIds),
      relatedTaskIds: relatedTaskIds ?? List<String>.from(this.relatedTaskIds),
      relatedSummaryIds:
          relatedSummaryIds ?? List<String>.from(this.relatedSummaryIds),
      isUserConfirmed: isUserConfirmed ?? this.isUserConfirmed,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
