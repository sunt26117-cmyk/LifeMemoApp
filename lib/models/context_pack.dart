class ContextItem {
  final String id;
  final String title;
  final DateTime date;
  final List<String> tags;
  ContextItem({
    required this.id,
    required this.title,
    required this.date,
    List<String>? tags,
  }) : tags = tags ?? <String>[];
  factory ContextItem.fromJson(Map<String, dynamic> map) {
    return ContextItem(
      id: map['id'] as String,
      title: map['title'] as String,
      date: DateTime.parse(map['date'] as String),
      tags: (map['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          <String>[],
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'date': date.toUtc().toIso8601String(),
      'tags': tags,
    };
  }

  ContextItem copyWith({
    String? id,
    String? title,
    DateTime? date,
    List<String>? tags,
  }) {
    return ContextItem(
      id: id ?? this.id,
      title: title ?? this.title,
      date: date ?? this.date,
      tags: tags ?? List<String>.from(this.tags),
    );
  }
}

class ContextPack {
  final List<ContextItem> memories;
  final List<ContextItem> photos;
  final List<ContextItem> tasks;
  final List<ContextItem> summaries;
  ContextPack({
    List<ContextItem>? memories,
    List<ContextItem>? photos,
    List<ContextItem>? tasks,
    List<ContextItem>? summaries,
  })  : memories = memories ?? <ContextItem>[],
        photos = photos ?? <ContextItem>[],
        tasks = tasks ?? <ContextItem>[],
        summaries = summaries ?? <ContextItem>[];
  factory ContextPack.fromJson(Map<String, dynamic> map) {
    return ContextPack(
      memories: (map['memories'] as List<dynamic>?)
              ?.map((e) => ContextItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          <ContextItem>[],
      photos: (map['photos'] as List<dynamic>?)
              ?.map((e) => ContextItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          <ContextItem>[],
      tasks: (map['tasks'] as List<dynamic>?)
              ?.map((e) => ContextItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          <ContextItem>[],
      summaries: (map['summaries'] as List<dynamic>?)
              ?.map((e) => ContextItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          <ContextItem>[],
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'memories': memories.map((m) => m.toJson()).toList(),
      'photos': photos.map((p) => p.toJson()).toList(),
      'tasks': tasks.map((t) => t.toJson()).toList(),
      'summaries': summaries.map((s) => s.toJson()).toList(),
    };
  }

  ContextPack copyWith({
    List<ContextItem>? memories,
    List<ContextItem>? photos,
    List<ContextItem>? tasks,
    List<ContextItem>? summaries,
  }) {
    return ContextPack(
      memories: memories ?? List<ContextItem>.from(this.memories),
      photos: photos ?? List<ContextItem>.from(this.photos),
      tasks: tasks ?? List<ContextItem>.from(this.tasks),
      summaries: summaries ?? List<ContextItem>.from(this.summaries),
    );
  }
}
