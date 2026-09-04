// lib/ai/growth_ai.dart
//
// 成长曲线 AI 自然语言分析角色封装。
import 'dart:async';
import 'dart:convert';

import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/prompts.dart';

class GrowthAi {
  final AiClient client;

  GrowthAi({required this.client});

  /// 根据成长曲线得分序列生成温和的自然语言分析。
  /// 返回严格归一化的 JSON：{ "analysis": string }。
  Future<Map<String, dynamic>> generateGrowthAnalysis({
    required List<double> scores,
    required List<String> labels,
  }) async {
    final prompt = growthAnalysisPrompt(scores: scores, labels: labels);
    String raw;
    try {
      raw = await client.chat(
        systemPrompt: '你是成长分析助手，输出严格 JSON。',
        userPrompt: prompt,
        jsonMode: true,
      );
    } on AiException {
      rethrow;
    } catch (e) {
      throw AiException('GrowthAi unexpected error: $e');
    }

    String jsonText;
    try {
      jsonText = extractJson(raw);
    } on FormatException {
      throw AiParseException('Failed to extract JSON from AI response', raw);
    }

    try {
      final Map<String, dynamic> map = json.decode(jsonText);
      if (!map.containsKey('analysis') ||
          map['analysis'] == null ||
          (map['analysis'] is String &&
              (map['analysis'] as String).trim().isEmpty)) {
        throw AiParseException('Missing or empty analysis', raw);
      }
      map['analysis'] = (map['analysis'] as String).trim();
      return map;
    } on AiParseException {
      rethrow;
    } catch (e) {
      throw AiParseException('Failed to parse growth analysis JSON: $e', raw);
    }
  }
}
