class Photo {
  final String id;
  final String localPath;
  final DateTime takenAt;
  final String? aiSummary;
  final bool summaryConfirmed;
  final List<String> tags;
  final List<String> relatedMemoryIds;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  Photo({
    required this.id,
    required this.localPath,
    required this.takenAt,
    this.aiSummary,
    this.summaryConfirmed = false,
    List<String>? tags,
    List<String>? relatedMemoryIds,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
  })  : tags = tags ?? <String>[],
        relatedMemoryIds = relatedMemoryIds ?? <String>[],
        metadata = metadata ?? <String, dynamic>{},
        createdAt = (createdAt ?? DateTime.now().toUtc());
  factory Photo.fromJson(Map<String, dynamic> map) {
    return Photo(
      id: map['id'] as String,
      localPath: map['local_path'] as String,
      takenAt: DateTime.parse(map['taken_at'] as String),
      aiSummary: map['ai_summary'] as String?,
      summaryConfirmed: map['summary_confirmed'] as bool? ?? false,
      tags: (map['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          <String>[],
      relatedMemoryIds: (map['related_memory_ids'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      metadata:
          (map['metadata'] as Map<String, dynamic>?) ?? <String, dynamic>{},
      createdAt: map['created_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(map['created_at'] as String),
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'local_path': localPath,
      'taken_at': takenAt.toUtc().toIso8601String(),
      'ai_summary': aiSummary,
      'summary_confirmed': summaryConfirmed,
      'tags': tags,
      'related_memory_ids': relatedMemoryIds,
      'metadata': metadata,
      'created_at': createdAt.toUtc().toIso8601String(),
    };
  }

  Photo copyWith({
    String? id,
    String? localPath,
    DateTime? takenAt,
    String? aiSummary,
    bool? summaryConfirmed,
    List<String>? tags,
    List<String>? relatedMemoryIds,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
  }) {
    return Photo(
      id: id ?? this.id,
      localPath: localPath ?? this.localPath,
      takenAt: takenAt ?? this.takenAt,
      aiSummary: aiSummary ?? this.aiSummary,
      summaryConfirmed: summaryConfirmed ?? this.summaryConfirmed,
      tags: tags ?? List<String>.from(this.tags),
      relatedMemoryIds:
          relatedMemoryIds ?? List<String>.from(this.relatedMemoryIds),
      metadata: metadata ?? Map<String, dynamic>.from(this.metadata),
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
