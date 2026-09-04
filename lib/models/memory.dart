class Memory {
  final String id;
  final String? title;
  final String content;
  final List<String> tags;
  final String? aiSummary;
  final List<String> relatedMediaIds;
  final Map<String, dynamic> metadata; // 位置(addr/lat/lng)等附加信息（jsonb）
  final DateTime createdAt;
  Memory({
    required this.id,
    this.title,
    required this.content,
    List<String>? tags,
    this.aiSummary,
    List<String>? relatedMediaIds,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
  })  : tags = tags ?? <String>[],
        relatedMediaIds = relatedMediaIds ?? <String>[],
        metadata = metadata ?? <String, dynamic>{},
        createdAt = (createdAt ?? DateTime.now().toUtc());
  factory Memory.fromJson(Map<String, dynamic> map) {
    return Memory(
      id: map['id'] as String,
      title: map['title'] as String?,
      content: map['content'] as String,
      tags: (map['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          <String>[],
      aiSummary: map['ai_summary'] as String?,
      metadata:
          (map['metadata'] as Map<String, dynamic>?) ?? <String, dynamic>{},
      relatedMediaIds: (map['related_media_ids'] as List<dynamic>?)
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
      'content': content,
      'tags': tags,
      'ai_summary': aiSummary,
      'metadata': metadata,
      'related_media_ids': relatedMediaIds,
      'created_at': createdAt.toUtc().toIso8601String(),
    };
  }

  Memory copyWith({
    String? id,
    String? title,
    String? content,
    List<String>? tags,
    String? aiSummary,
    List<String>? relatedMediaIds,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
  }) {
    return Memory(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      tags: tags ?? List<String>.from(this.tags),
      aiSummary: aiSummary ?? this.aiSummary,
      relatedMediaIds:
          relatedMediaIds ?? List<String>.from(this.relatedMediaIds),
      metadata: metadata ?? Map<String, dynamic>.from(this.metadata),
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
