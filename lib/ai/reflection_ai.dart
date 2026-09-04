import 'dart:async';
import 'dart:convert';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/prompts.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/models/context_pack.dart';

/// AI 解析结果：保留原始输出（V2 审查：人工确认需真实原文，禁止 toJson 冒充）
class ReflectionAiResult {
  final ReflectionSummary summary;
  final String rawOutput;
  const ReflectionAiResult({required this.summary, required this.rawOutput});
}

class ReflectionAi {
  final AiClient client;
  ReflectionAi({required this.client});
  Future<ReflectionAiResult> generate({
    required String eventDescription,
    String? emotion,
    String? actionTaken,
    String? result,
    required List<String> tags,
    required ContextPack pack,
  }) async {
    final prompt = reflectionPrompt(
      eventDescription: eventDescription,
      emotion: emotion,
      actionTaken: actionTaken,
      result: result,
      tags: tags,
      pack: pack,
    );
    String raw;
    try {
      raw = await client.chat(
        systemPrompt: '你是一个反思助手，输出严格 JSON。',
        userPrompt: prompt,
        jsonMode: true,
      );
    } on AiException {
      rethrow;
    } catch (e) {
      throw AiException('ReflectionAi unexpected error: $e');
    }
    String jsonText;
    try {
      jsonText = extractJson(raw);
    } on FormatException catch (_) {
      throw AiParseException('Failed to extract JSON from AI response', raw);
    }
    try {
      final Map<String, dynamic> map = json.decode(jsonText);
      final requiredKeys = [
        'eventSummary',
        'goodPoints',
        'ignoredFactors',
        'improvementPoints',
        'nextSuggestion'
      ];
      for (final k in requiredKeys) {
        if (!map.containsKey(k) ||
            map[k] == null ||
            (map[k] is String && (map[k] as String).trim().isEmpty)) {
          throw AiParseException('Missing or empty field: $k', raw);
        }
      }
      if (!map.containsKey('citations') || map['citations'] == null) {
        map['citations'] = {'memoryIds': [], 'photoIds': []};
      } else {
        final cit = map['citations'];
        if (cit is Map) {
          cit['memoryIds'] ??= [];
          cit['photoIds'] ??= [];
        } else {
          map['citations'] = {'memoryIds': [], 'photoIds': []};
        }
      }
      final summary = ReflectionSummary.fromJson(map);
      return ReflectionAiResult(summary: summary, rawOutput: raw);
    } on AiParseException {
      rethrow;
    } catch (e) {
      throw AiParseException('Failed to parse ReflectionSummary JSON', raw);
    }
  }
}
