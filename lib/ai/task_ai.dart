import 'dart:async';
import 'dart:convert';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/prompts.dart';

class TaskAi {
  final AiClient client;
  TaskAi({required this.client});
  Future<List<String>> decompose({
    required String title,
    String? description,
  }) async {
    final prompt = taskDecomposePrompt(title: title, description: description);
    String raw;
    try {
      raw = await client.chat(
        systemPrompt: '你是任务拆解助手，输出严格 JSON。',
        userPrompt: prompt,
        jsonMode: true,
      );
    } on AiException {
      rethrow;
    } catch (e) {
      throw AiException('TaskAi unexpected error: $e');
    }
    String jsonText;
    try {
      jsonText = extractJson(raw);
    } on FormatException {
      throw AiParseException('Failed to extract JSON from AI response', raw);
    }
    try {
      final Map<String, dynamic> map = json.decode(jsonText);
      if (!map.containsKey('steps') || map['steps'] == null) {
        throw AiParseException('Missing steps array', raw);
      }
      final stepsRaw = map['steps'];
      if (stepsRaw is! List) {
        throw AiParseException('steps is not a list', raw);
      }
      final List<String> steps = [];
      for (final s in stepsRaw) {
        if (s is String && s.trim().isNotEmpty) {
          steps.add(s.trim());
        }
      }
      if (steps.isEmpty) {
        throw AiParseException('No valid steps found', raw);
      }
      return steps;
    } on AiParseException {
      rethrow;
    } catch (e) {
      throw AiParseException('Failed to parse steps JSON', raw);
    }
  }
}
