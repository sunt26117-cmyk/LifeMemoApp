import '../constants/enums.dart';

class Trend {
  final String id;
  final String trendName;
  final String category;
  final double score;
  final ThemeDirection direction;
  final double weight;
  final List<Map<String, dynamic>> evidence;
  final String? cluster;
  final DateTime updatedAt;
  Trend({
    required this.id,
    required this.trendName,
    required this.category,
    required this.score,
    required this.direction,
    required this.weight,
    List<Map<String, dynamic>>? evidence,
    this.cluster,
    DateTime? updatedAt,
  })  : evidence = evidence ?? <Map<String, dynamic>>[],
        updatedAt = (updatedAt ?? DateTime.now().toUtc());
  factory Trend.fromJson(Map<String, dynamic> map) {
    return Trend(
      id: map['id'] as String,
      trendName: map['trend_name'] as String,
      category: map['category'] as String,
      score: (map['score'] is int)
          ? (map['score'] as int).toDouble()
          : (map['score'] as num).toDouble(),
      direction: ThemeDirection.fromString(map['direction'] as String),
      weight: (map['weight'] is int)
          ? (map['weight'] as int).toDouble()
          : (map['weight'] as num).toDouble(),
      evidence: (map['evidence'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map<String, dynamic>))
              .toList() ??
          <Map<String, dynamic>>[],
      cluster: map['cluster'] as String?,
      updatedAt: map['updated_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(map['updated_at'] as String),
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'trend_name': trendName,
      'category': category,
      'score': score,
      'direction': direction.value,
      'weight': weight,
      'evidence': evidence,
      'cluster': cluster,
      'updated_at': updatedAt.toUtc().toIso8601String(),
    };
  }

  Trend copyWith({
    String? id,
    String? trendName,
    String? category,
    double? score,
    ThemeDirection? direction,
    double? weight,
    List<Map<String, dynamic>>? evidence,
    String? cluster,
    DateTime? updatedAt,
  }) {
    return Trend(
      id: id ?? this.id,
      trendName: trendName ?? this.trendName,
      category: category ?? this.category,
      score: score ?? this.score,
      direction: direction ?? this.direction,
      weight: weight ?? this.weight,
      evidence: evidence ?? List<Map<String, dynamic>>.from(this.evidence),
      cluster: cluster ?? this.cluster,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
