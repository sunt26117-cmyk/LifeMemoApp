/// 反思 AI 输出模型 —— 严格按 AGENTS.md §9.1 Schema。
///
/// 六段文本字段（eventSummary/goodPoints/ignoredFactors/
/// improvementPoints/nextSuggestion）+ suggestedTask + citations。
/// JSON 键使用 camelCase（与 §9.1 AI 输出格式一致）。
class Citations {
  final List<String> memoryIds;
  final List<String> photoIds;

  Citations({
    List<String>? memoryIds,
    List<String>? photoIds,
  })  : memoryIds = memoryIds ?? <String>[],
        photoIds = photoIds ?? <String>[];

  factory Citations.fromJson(Map<String, dynamic>? map) {
    if (map == null) return Citations();
    return Citations(
      memoryIds: (map['memoryIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      photoIds: (map['photoIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'memoryIds': memoryIds,
      'photoIds': photoIds,
    };
  }

  Citations copyWith({
    List<String>? memoryIds,
    List<String>? photoIds,
  }) {
    return Citations(
      memoryIds: memoryIds ?? List<String>.from(this.memoryIds),
      photoIds: photoIds ?? List<String>.from(this.photoIds),
    );
  }
}

/// 反思 AI 输出（§9.1）
class ReflectionSummary {
  final String eventSummary;
  final String goodPoints;
  final String ignoredFactors;
  final String improvementPoints;
  final String nextSuggestion;
  final String? suggestedTask;
  final Citations citations;

  ReflectionSummary({
    required this.eventSummary,
    this.goodPoints = '',
    this.ignoredFactors = '',
    this.improvementPoints = '',
    required this.nextSuggestion,
    this.suggestedTask,
    Citations? citations,
  }) : citations = citations ?? Citations();

  factory ReflectionSummary.fromJson(Map<String, dynamic> map) {
    return ReflectionSummary(
      eventSummary: map['eventSummary'] as String? ?? '',
      goodPoints: map['goodPoints'] as String? ?? '',
      ignoredFactors: map['ignoredFactors'] as String? ?? '',
      improvementPoints: map['improvementPoints'] as String? ?? '',
      nextSuggestion: map['nextSuggestion'] as String? ?? '',
      suggestedTask: map['suggestedTask'] as String?,
      citations: Citations.fromJson(
          (map['citations'] as Map<String, dynamic>?) ?? <String, dynamic>{}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'eventSummary': eventSummary,
      'goodPoints': goodPoints,
      'ignoredFactors': ignoredFactors,
      'improvementPoints': improvementPoints,
      'nextSuggestion': nextSuggestion,
      'suggestedTask': suggestedTask,
      'citations': citations.toJson(),
    };
  }

  ReflectionSummary copyWith({
    String? eventSummary,
    String? goodPoints,
    String? ignoredFactors,
    String? improvementPoints,
    String? nextSuggestion,
    String? suggestedTask,
    Citations? citations,
  }) {
    return ReflectionSummary(
      eventSummary: eventSummary ?? this.eventSummary,
      goodPoints: goodPoints ?? this.goodPoints,
      ignoredFactors: ignoredFactors ?? this.ignoredFactors,
      improvementPoints: improvementPoints ?? this.improvementPoints,
      nextSuggestion: nextSuggestion ?? this.nextSuggestion,
      suggestedTask: suggestedTask ?? this.suggestedTask,
      citations: citations ?? this.citations.copyWith(),
    );
  }
}
