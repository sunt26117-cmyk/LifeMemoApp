// test/ai/growth_ai_test.dart
import 'dart:convert';

import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/growth_ai.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockAiClient extends Mock implements AiClient {}

void main() {
  group('GrowthAi', () {
    late MockAiClient mockClient;
    late GrowthAi growthAi;

    setUp(() {
      mockClient = MockAiClient();
      growthAi = GrowthAi(client: mockClient);
    });

    test('正常返回分析文本，不含压力词', () async {
      const analysis = '最近几周整体呈现温和上升趋势，继续保持即可。';
      final raw = json.encode({'analysis': analysis});
      when(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).thenAnswer((_) async => raw);

      final res = await growthAi.generateGrowthAnalysis(
        scores: [10, 15, 20],
        labels: ['第1周', '第2周', '第3周'],
      );

      expect(res['analysis'], analysis);
      const pressureWords = ['落后', '失败', '你应该更努力'];
      for (final word in pressureWords) {
        expect((res['analysis'] as String).contains(word), false);
      }
    });

    test('AI 抛网络异常 -> 方法抛 AiException', () async {
      when(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).thenThrow(AiNetworkException('网络错误'));

      expect(
        () => growthAi.generateGrowthAnalysis(scores: [1], labels: ['a']),
        throwsA(isA<AiException>()),
      );
    });

    test('返回非法 JSON -> 抛 AiParseException', () async {
      when(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).thenAnswer((_) async => 'not json');

      expect(
        () => growthAi.generateGrowthAnalysis(scores: [1], labels: ['a']),
        throwsA(isA<AiParseException>()),
      );
    });
  });
}
