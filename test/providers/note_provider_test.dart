import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/models/note.dart';
import 'package:ai_life_recorder/providers/note_provider.dart';
import 'package:ai_life_recorder/repositories/note_repository.dart';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/note_ai.dart';

/// 抛异常的假 AI（模拟 AI 服务不可用）
class _ExplodingNoteAi implements NoteAi {
  @override
  AiClient get client => _neverUsedClient;
  @override
  Future<String> organize({required String content, String? title}) async {
    throw AiException('mock ai down');
  }
}

/// 正常返回整理结果的假 AI
class _OkNoteAi implements NoteAi {
  @override
  AiClient get client => _neverUsedClient;
  @override
  Future<String> organize({required String content, String? title}) async {
    return '已整理：$content';
  }
}

final AiClient _neverUsedClient = AiClient(apiKey: 'test-dummy');

void main() {
  group('NoteProvider 保存与 AI 解耦（TASK-EXT-08）', () {
    test('AI 抛异常时小记保存不受影响，仅整理状态为 failed', () async {
      final provider = NoteProvider(
        repository: InMemoryNoteRepository(),
        noteAi: _ExplodingNoteAi(),
      );
      final saved = await provider.save(
        title: '测试',
        content: '原始内容',
      );
      expect(saved, isNotNull);
      expect(saved!.content, '原始内容');
      // 主动触发整理 → AI 失败
      await provider.organize(saved.id);
      final after = provider.notes.firstWhere((n) => n.id == saved.id);
      expect(after.content, '原始内容'); // 原文未被污染
      expect(after.aiStatus, NoteAiStatus.failed);
      expect(after.aiOrganized, isNull);
    });
    test('AI 未配置（null）时保存照常成功', () async {
      final provider = NoteProvider(
        repository: InMemoryNoteRepository(),
        noteAi: null,
      );
      final saved = await provider.save(content: '无 AI 也可保存');
      expect(saved, isNotNull);
      expect(saved!.content, '无 AI 也可保存');
    });
    test('AI 成功时 aiOrganized 落库且状态 success', () async {
      final provider = NoteProvider(
        repository: InMemoryNoteRepository(),
        noteAi: _OkNoteAi(),
      );
      final saved = await provider.save(content: '原始小记正文');
      await provider.organize(saved!.id);
      final after = provider.notes.firstWhere((n) => n.id == saved.id);
      expect(after.aiStatus, NoteAiStatus.success);
      expect(after.aiOrganized, '已整理：原始小记正文');
      expect(after.content, '原始小记正文'); // 原文不变
    });
    test('关键词过滤 + 删除', () async {
      final provider = NoteProvider(
        repository: InMemoryNoteRepository(),
        noteAi: null,
      );
      await provider.save(title: '工作', content: '写周报');
      await provider.save(title: '生活', content: '去超市');
      provider.setKeyword('周报');
      expect(provider.notes.length, 1);
      expect(provider.notes.first.title, '工作');
      provider.setKeyword('');
      expect(provider.notes.length, 2);
      final first = provider.notes.first;
      await provider.delete(first.id);
      expect(provider.notes.length, 1);
    });
  });
}
