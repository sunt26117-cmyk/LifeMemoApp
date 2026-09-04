import 'dart:async';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/prompts.dart';

class PhotoAi {
  final AiClient client;
  PhotoAi({required this.client});
  Future<String> generateSummary({
    required String takenAt,
    required List<String> tags,
  }) async {
    final prompt = photoSummaryPrompt(takenAt: takenAt, tags: tags);
    try {
      final resp = await client.chat(
        systemPrompt: '你是一个客观的照片场景描述器，只描述画面可见内容。',
        userPrompt: prompt,
        jsonMode: false,
      );
      return resp.trim();
    } on AiException {
      rethrow;
    } catch (e) {
      throw AiException('PhotoAi unexpected error: $e');
    }
  }
}
