import 'dart:async';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/prompts.dart';

/// 小记 AI 整理器（TASK-EXT-08）。
/// 只做可选异步整理，失败由上层标记 NoteAiStatus.failed，不污染原文。
class NoteAi {
  final AiClient client;
  NoteAi({required this.client});
  Future<String> organize({required String content, String? title}) async {
    final prompt = noteOrganizePrompt(content: content, title: title);
    try {
      final resp = await client.chat(
        systemPrompt: '你是一个小记整理助手，只润色不虚构。',
        userPrompt: prompt,
        jsonMode: false,
      );
      final text = resp.trim();
      if (text.isEmpty) {
        throw AiException('NoteAi empty response');
      }
      return text;
    } on AiException {
      rethrow;
    } catch (e) {
      throw AiException('NoteAi unexpected error: $e');
    }
  }
}
