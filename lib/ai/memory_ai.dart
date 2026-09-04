import 'dart:async';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/prompts.dart';

class MemoryAi {
  final AiClient client;
  MemoryAi({required this.client});
  Future<String> generateSummary({
    required String content,
    required List<String> tags,
  }) async {
    final prompt = memorySummaryPrompt(content: content, tags: tags);
    try {
      final resp = await client.chat(
        systemPrompt: '你是一个事实型摘要生成器。',
        userPrompt: prompt,
        jsonMode: false,
      );
      return resp.trim();
    } on AiException {
      rethrow;
    } catch (e) {
      throw AiException('MemoryAi unexpected error: $e');
    }
  }
}
