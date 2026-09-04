import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/models/note.dart';

void main() {
  group('Note model', () {
    final full = {
      'id': 'n1',
      'title': '会议小记',
      'content': '今天讨论了排期',
      'ai_organized': '会议讨论了排期事项。',
      'ai_status': 'success',
      'created_at': '2026-08-01T10:00:00.000Z',
      'updated_at': '2026-08-01T10:05:00.000Z',
    };
    test('完整字段 round-trip', () {
      final n = Note.fromJson(full);
      expect(n.toJson(), full);
      expect(n.aiStatus, NoteAiStatus.success);
    });
    test('可选标题为 null / ai_status 缺省 none', () {
      final json = {
        'id': 'n2',
        'content': '无标题小记',
        'created_at': '2026-08-02T10:00:00.000Z',
        'updated_at': '2026-08-02T10:00:00.000Z',
      };
      final n = Note.fromJson(json);
      expect(n.title, isNull);
      expect(n.aiStatus, NoteAiStatus.none);
      expect(n.toJson()['ai_status'], 'none');
      expect(n.toJson()['title'], isNull);
    });
    test('failed 状态 round-trip（AI 失败不丢原文）', () {
      final json = {
        'id': 'n3',
        'content': '原文还在',
        'ai_organized': null,
        'ai_status': 'failed',
        'created_at': '2026-08-03T10:00:00.000Z',
        'updated_at': '2026-08-03T10:00:00.000Z',
      };
      final n = Note.fromJson(json);
      expect(n.aiStatus, NoteAiStatus.failed);
      expect(n.content, '原文还在');
      expect(n.toJson()['ai_organized'], isNull);
    });
    test('copyWith / withClearedTitle', () {
      final n = Note.fromJson(full);
      final n2 = n.copyWith(content: '改过');
      expect(n2.content, '改过');
      expect(n2.id, 'n1');
      expect(n2.title, '会议小记');
      final cleared = n.withClearedTitle();
      expect(cleared.title, isNull);
    });
  });
}
