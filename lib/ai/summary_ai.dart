import 'dart:async';
import 'dart:convert';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/prompts.dart';
import 'package:ai_life_recorder/constants/enums.dart';

class SummaryAi {
  final AiClient client;
  SummaryAi({required this.client});
  Future<Map<String, dynamic>> generate({
    required SummaryType type,
    required Map<String, dynamic> aggregate,
  }) async {
    final prompt = summaryPrompt(type: type, aggregate: aggregate);
    String raw;
    try {
      raw = await client.chat(
        systemPrompt: '你是总结生成器，输出严格 JSON。',
        userPrompt: prompt,
        jsonMode: true,
      );
    } on AiException {
      rethrow;
    } catch (e) {
      throw AiException('SummaryAi unexpected error: $e');
    }
    String jsonText;
    try {
      jsonText = extractJson(raw);
    } on FormatException {
      throw AiParseException('Failed to extract JSON from AI response', raw);
    }
    try {
      final Map<String, dynamic> map = json.decode(jsonText);
      if (type == SummaryType.yearly) {
        // 年度 schema：校验 annualReflection，并归一化年度字段
        if (!map.containsKey('annualReflection') ||
            map['annualReflection'] == null ||
            (map['annualReflection'] is String &&
                (map['annualReflection'] as String).trim().isEmpty)) {
          throw AiParseException('Missing or empty annualReflection', raw);
        }
        map['annualTheme'] =
            (map['annualTheme'] is String) ? map['annualTheme'] : '';
        map['behaviorTrend'] =
            (map['behaviorTrend'] is String) ? map['behaviorTrend'] : '';
        map['moodTrend'] = (map['moodTrend'] is String) ? map['moodTrend'] : '';
        map['lifeRhythm'] =
            (map['lifeRhythm'] is String) ? map['lifeRhythm'] : '';
        map['highlights'] =
            (map['highlights'] is List) ? map['highlights'] : [];
        map['nextYearSuggestions'] = (map['nextYearSuggestions'] is List)
            ? map['nextYearSuggestions']
            : [];
        return map;
      }
      if (!map.containsKey('content') ||
          map['content'] == null ||
          (map['content'] is String &&
              (map['content'] as String).trim().isEmpty)) {
        throw AiParseException('Missing or empty content', raw);
      }
      map['themes'] = (map['themes'] is List) ? map['themes'] : [];
      map['highlights'] = (map['highlights'] is List) ? map['highlights'] : [];
      map['taskSuggestions'] =
          (map['taskSuggestions'] is List) ? map['taskSuggestions'] : [];
      return map;
    } on AiParseException {
      rethrow;
    } catch (e) {
      throw AiParseException('Failed to parse summary JSON', raw);
    }
  }
}
