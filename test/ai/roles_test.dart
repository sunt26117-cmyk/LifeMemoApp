import 'dart:convert';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/ai/memory_ai.dart';
import 'package:ai_life_recorder/ai/reflection_ai.dart';
import 'package:ai_life_recorder/ai/task_ai.dart';
import 'package:ai_life_recorder/ai/summary_ai.dart';
import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockAiClient extends Mock implements AiClient {}

void main() {
  group('AI 封装角色测试', () {
    late MockAiClient mockClient;
    setUp(() {
      mockClient = MockAiClient();
    });
    test('MemoryAi.generateSummary 返回字符串且 systemPrompt 被传递', () async {
      final memAi = MemoryAi(client: mockClient);
      when(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).thenAnswer((_) async => '这是一个事实摘要。');
      final res = await memAi
          .generateSummary(content: '某件事的原文', tags: ['tag1', 'tag2']);
      expect(res, isA<String>());
      final verification = verify(() => mockClient.chat(
            systemPrompt: captureAny(named: 'systemPrompt'),
            userPrompt: captureAny(named: 'userPrompt'),
            jsonMode: captureAny(named: 'jsonMode'),
          ));
      verification.called(1);
      final captured = verification.captured;
      expect(captured[0], contains('摘要'));
      expect(captured[2], false);
    });
    test('ReflectionAi.generate 成功返回 ReflectionSummary', () async {
      final reflAi = ReflectionAi(client: mockClient);
      final pack =
          ContextPack(memories: [], photos: [], tasks: [], summaries: []);
      final jsonMap = {
        'eventSummary': '事件总结',
        'goodPoints': '做得好的点',
        'ignoredFactors': '被忽视的因素',
        'improvementPoints': '改进点',
        'nextSuggestion': '下一步建议',
        'suggestedTask': '建议任务',
        'citations': {
          'memoryIds': <String>[],
          'photoIds': <String>[],
        }
      };
      final raw = '```json\n${json.encode(jsonMap)}\n```';
      when(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).thenAnswer((_) async => raw);
      final result = await reflAi.generate(
        eventDescription: '发生了什么',
        emotion: 'happy',
        actionTaken: '做了事',
        result: '结果',
        tags: ['t1'],
        pack: pack,
      );
      expect(result.summary, isA<ReflectionSummary>());
      expect(result.summary.eventSummary, '事件总结');
      expect(result.rawOutput, raw);
      verify(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).called(1);
    });
    test('ReflectionAi 输出缺 goodPoints -> 抛 AiParseException', () async {
      final reflAi = ReflectionAi(client: mockClient);
      final pack =
          ContextPack(memories: [], photos: [], tasks: [], summaries: []);
      final jsonMap = {
        'eventSummary': '事件总结',
        'ignoredFactors': '被忽视的因素',
        'improvementPoints': '改进点',
        'nextSuggestion': '下一步建议',
        'suggestedTask': null,
        'citations': {'memoryIds': [], 'photoIds': []}
      };
      final raw = json.encode(jsonMap);
      when(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).thenAnswer((_) async => raw);
      expect(
          () => reflAi.generate(
                eventDescription: 'e',
                tags: [],
                pack: pack,
              ),
          throwsA(isA<AiParseException>()));
    });
    test('ReflectionAi 输出非法 JSON -> 抛 AiParseException', () async {
      final reflAi = ReflectionAi(client: mockClient);
      final pack =
          ContextPack(memories: [], photos: [], tasks: [], summaries: []);
      const raw = 'not a json';
      when(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).thenAnswer((_) async => raw);
      expect(
          () => reflAi.generate(
                eventDescription: 'e',
                tags: [],
                pack: pack,
              ),
          throwsA(isA<AiParseException>()));
    });
    test('TaskAi.decompose 正常解析 steps', () async {
      final taskAi = TaskAi(client: mockClient);
      final rawMap = {
        'steps': ['第一步 做A', '第二步 做B', '第三步 做C']
      };
      when(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).thenAnswer((_) async => json.encode(rawMap));
      final steps = await taskAi.decompose(title: '做事', description: '描述');
      expect(steps.length, 3);
      expect(steps[0], '第一步 做A');
    });
    test('TaskAi steps 非 JSON -> 抛 AiParseException', () async {
      final taskAi = TaskAi(client: mockClient);
      when(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).thenAnswer((_) async => 'not json');
      expect(
          () => taskAi.decompose(title: 't'), throwsA(isA<AiParseException>()));
    });
    test('SummaryAi.generate 返回 Map 并包含字段', () async {
      final summaryAi = SummaryAi(client: mockClient);
      final aggregate = {'k': 'v'};
      final rawMap = {
        'content': '本周总结',
        'themes': ['A', 'B', 'C'],
        'highlights': ['h1', 'h2', 'h3'],
        'taskSuggestions': ['做X', '做Y']
      };
      when(() => mockClient.chat(
            systemPrompt: any(named: 'systemPrompt'),
            userPrompt: any(named: 'userPrompt'),
            jsonMode: any(named: 'jsonMode'),
          )).thenAnswer((_) async => json.encode(rawMap));
      final res = await summaryAi.generate(
          type: SummaryType.weekly, aggregate: aggregate);
      expect(res['content'], '本周总结');
      expect((res['themes'] as List).length, 3);
      expect((res['taskSuggestions'] as List).first.startsWith('做'), true);
    });
  });
}
