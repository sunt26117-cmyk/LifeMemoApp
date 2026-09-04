import '../constants/enums.dart';

class ThemeItem {
  final String id;
  final String themeName;
  final double weight;
  final ThemeDirection direction;
  final List<Map<String, dynamic>> evidence;
  final List<String> clusterNames;
  final List<String> trendNames;
  final DateTime updatedAt;
  ThemeItem({
    required this.id,
    required this.themeName,
    required this.weight,
    required this.direction,
    List<Map<String, dynamic>>? evidence,
    List<String>? clusterNames,
    List<String>? trendNames,
    DateTime? updatedAt,
  })  : evidence = evidence ?? <Map<String, dynamic>>[],
        clusterNames = clusterNames ?? <String>[],
        trendNames = trendNames ?? <String>[],
        updatedAt = (updatedAt ?? DateTime.now().toUtc());
  factory ThemeItem.fromJson(Map<String, dynamic> map) {
    return ThemeItem(
      id: map['id'] as String,
      themeName: map['theme_name'] as String,
      weight: (map['weight'] is int)
          ? (map['weight'] as int).toDouble()
          : (map['weight'] as num).toDouble(),
      direction: ThemeDirection.fromString(map['direction'] as String),
      evidence: (map['evidence'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map<String, dynamic>))
              .toList() ??
          <Map<String, dynamic>>[],
      clusterNames: (map['cluster_names'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      trendNames: (map['trend_names'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      updatedAt: map['updated_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(map['updated_at'] as String),
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'theme_name': themeName,
      'weight': weight,
      'direction': direction.value,
      'evidence': evidence,
      'cluster_names': clusterNames,
      'trend_names': trendNames,
      'updated_at': updatedAt.toUtc().toIso8601String(),
    };
  }

  ThemeItem copyWith({
    String? id,
    String? themeName,
    double? weight,
    ThemeDirection? direction,
    List<Map<String, dynamic>>? evidence,
    List<String>? clusterNames,
    List<String>? trendNames,
    DateTime? updatedAt,
  }) {
    return ThemeItem(
      id: id ?? this.id,
      themeName: themeName ?? this.themeName,
      weight: weight ?? this.weight,
      direction: direction ?? this.direction,
      evidence: evidence ?? List<Map<String, dynamic>>.from(this.evidence),
      clusterNames: clusterNames ?? List<String>.from(this.clusterNames),
      trendNames: trendNames ?? List<String>.from(this.trendNames),
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
