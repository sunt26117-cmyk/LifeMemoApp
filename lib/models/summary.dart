import '../constants/enums.dart';

class Summary {
  final String id;
  final SummaryType type;
  final DateTime periodStart;
  final DateTime periodEnd;
  final String? content;
  final List<String> themes;
  final Map<String, dynamic> trends;
  final List<String> highlights;
  final List<String> taskSuggestions;
  final Map<String, dynamic> chartData;
  final DateTime createdAt;
  Summary({
    required this.id,
    required this.type,
    required this.periodStart,
    required this.periodEnd,
    this.content,
    List<String>? themes,
    Map<String, dynamic>? trends,
    List<String>? highlights,
    List<String>? taskSuggestions,
    Map<String, dynamic>? chartData,
    DateTime? createdAt,
  })  : themes = themes ?? <String>[],
        trends = trends ?? <String, dynamic>{},
        highlights = highlights ?? <String>[],
        taskSuggestions = taskSuggestions ?? <String>[],
        chartData = chartData ?? <String, dynamic>{},
        createdAt = (createdAt ?? DateTime.now().toUtc());
  factory Summary.fromJson(Map<String, dynamic> map) {
    return Summary(
      id: map['id'] as String,
      type: SummaryType.fromString(map['type'] as String),
      periodStart: DateTime.parse(map['period_start'] as String),
      periodEnd: DateTime.parse(map['period_end'] as String),
      content: map['content'] as String?,
      themes:
          (map['themes'] as List<dynamic>?)?.map((e) => e as String).toList() ??
              <String>[],
      trends: (map['trends'] as Map<String, dynamic>?) ?? <String, dynamic>{},
      highlights: (map['highlights'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      taskSuggestions: (map['task_suggestions'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      chartData:
          (map['chart_data'] as Map<String, dynamic>?) ?? <String, dynamic>{},
      createdAt: map['created_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(map['created_at'] as String),
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.value,
      'period_start': periodStart.toUtc().toIso8601String(),
      'period_end': periodEnd.toUtc().toIso8601String(),
      'content': content,
      'themes': themes,
      'trends': trends,
      'highlights': highlights,
      'task_suggestions': taskSuggestions,
      'chart_data': chartData,
      'created_at': createdAt.toUtc().toIso8601String(),
    };
  }

  Summary copyWith({
    String? id,
    SummaryType? type,
    DateTime? periodStart,
    DateTime? periodEnd,
    String? content,
    List<String>? themes,
    Map<String, dynamic>? trends,
    List<String>? highlights,
    List<String>? taskSuggestions,
    Map<String, dynamic>? chartData,
    DateTime? createdAt,
  }) {
    return Summary(
      id: id ?? this.id,
      type: type ?? this.type,
      periodStart: periodStart ?? this.periodStart,
      periodEnd: periodEnd ?? this.periodEnd,
      content: content ?? this.content,
      themes: themes ?? List<String>.from(this.themes),
      trends: trends ?? Map<String, dynamic>.from(this.trends),
      highlights: highlights ?? List<String>.from(this.highlights),
      taskSuggestions:
          taskSuggestions ?? List<String>.from(this.taskSuggestions),
      chartData: chartData ?? Map<String, dynamic>.from(this.chartData),
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
