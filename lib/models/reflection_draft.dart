import 'package:flutter/foundation.dart';

class ReflectionDraft {
  final String eventDescription;
  final String? emotion;
  final String? actionTaken;
  final String? result;
  final List<String> tags;
  ReflectionDraft({
    required this.eventDescription,
    this.emotion,
    this.actionTaken,
    this.result,
    List<String>? tags,
  }) : tags = tags ?? const [];
  ReflectionDraft copyWith({
    String? eventDescription,
    String? emotion,
    String? actionTaken,
    String? result,
    List<String>? tags,
  }) {
    return ReflectionDraft(
      eventDescription: eventDescription ?? this.eventDescription,
      emotion: emotion ?? this.emotion,
      actionTaken: actionTaken ?? this.actionTaken,
      result: result ?? this.result,
      tags: tags ?? List<String>.from(this.tags),
    );
  }

  bool get isValid => eventDescription.trim().length >= 2;
  @override
  String toString() {
    return 'ReflectionDraft(eventDescription: $eventDescription, emotion: $emotion, actionTaken: $actionTaken, result: $result, tags: $tags)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ReflectionDraft &&
        other.eventDescription == eventDescription &&
        other.emotion == emotion &&
        other.actionTaken == actionTaken &&
        other.result == result &&
        listEquals(other.tags, tags);
  }

  @override
  int get hashCode =>
      eventDescription.hashCode ^
      (emotion?.hashCode ?? 0) ^
      (actionTaken?.hashCode ?? 0) ^
      (result?.hashCode ?? 0) ^
      tags.hashCode;
}
