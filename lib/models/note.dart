// lib/models/note.dart
//
// 小记模型（TASK-EXT-08，对应需求 §27/§28）。
// 小记保存与 AI 完全解耦：content 永远是用户原文；AI 整理结果存 aiOrganized，
// 状态存 aiStatus——AI 失败只标记 failed，绝不污染/回滚原文。

/// AI 整理状态机：生成中/成功/失败/重新生成（重新生成 = 从 failed/success 再次发起）。
enum NoteAiStatus {
  none, // 未整理
  generating, // 生成中
  success, // 整理成功
  failed, // 整理失败（原文不变，可重试）
  ;

  String get value {
    switch (this) {
      case NoteAiStatus.none:
        return 'none';
      case NoteAiStatus.generating:
        return 'generating';
      case NoteAiStatus.success:
        return 'success';
      case NoteAiStatus.failed:
        return 'failed';
    }
  }

  static NoteAiStatus fromValue(String? v) {
    switch (v) {
      case 'generating':
        return NoteAiStatus.generating;
      case 'success':
        return NoteAiStatus.success;
      case 'failed':
        return NoteAiStatus.failed;
      default:
        return NoteAiStatus.none;
    }
  }
}

class Note {
  final String id;
  final String? title; // 可选
  final String content; // 必填原文
  final String? aiOrganized; // AI 整理结果（独立于原文）
  final NoteAiStatus aiStatus;
  final DateTime createdAt;
  final DateTime updatedAt;
  Note({
    required this.id,
    this.title,
    required this.content,
    this.aiOrganized,
    this.aiStatus = NoteAiStatus.none,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = (createdAt ?? DateTime.now().toUtc()),
        updatedAt = (updatedAt ?? DateTime.now().toUtc());
  factory Note.fromJson(Map<String, dynamic> map) {
    return Note(
      id: map['id'] as String,
      title: map['title'] as String?,
      content: map['content'] as String,
      aiOrganized: map['ai_organized'] as String?,
      aiStatus: NoteAiStatus.fromValue(map['ai_status'] as String?),
      createdAt: map['created_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(map['created_at'] as String).toUtc(),
      updatedAt: map['updated_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(map['updated_at'] as String).toUtc(),
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      'ai_organized': aiOrganized,
      'ai_status': aiStatus.value,
      'created_at': createdAt.toUtc().toIso8601String(),
      'updated_at': updatedAt.toUtc().toIso8601String(),
    };
  }

  Note copyWith({
    String? title,
    String? content,
    String? aiOrganized,
    NoteAiStatus? aiStatus,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    final String? nextTitle;
    if (title == null) {
      nextTitle = this.title;
    } else {
      nextTitle = title;
    }
    return Note(
      id: id,
      title: nextTitle,
      content: content ?? this.content,
      aiOrganized: aiOrganized ?? this.aiOrganized,
      aiStatus: aiStatus ?? this.aiStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? DateTime.now().toUtc(),
    );
  }

  /// 显式清空标题（copyWith 无法表达置 null）。
  Note withClearedTitle() {
    return Note(
      id: id,
      title: null,
      content: content,
      aiOrganized: aiOrganized,
      aiStatus: aiStatus,
      createdAt: createdAt,
      updatedAt: DateTime.now().toUtc(),
    );
  }
}
