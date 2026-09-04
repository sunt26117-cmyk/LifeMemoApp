// test/services/reflection_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:ai_life_recorder/services/reflection_service.dart';
import 'package:ai_life_recorder/ai/reflection_ai.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/models/reflection_draft.dart';
import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/models/generation_result.dart';
import 'package:ai_life_recorder/utils/validator.dart';
import 'package:ai_life_recorder/ai/ai_client.dart';

class MockReflectionAi extends Mock implements ReflectionAi {}

ReflectionSummary _makeSummary(String idSuffix) {
  return ReflectionSummary(
    eventSummary: 'summary-$idSuffix',
    goodPoints: 'good',
    ignoredFactors: 'ignored',
    improvementPoints: 'improve',
    nextSuggestion: 'next',
    suggestedTask: null,
  );
}

ValidationResult _vrPassed() =>
    ValidationResult(passed: true, violations: const []);
ValidationResult _vrFailed(List<Violation> vs) =>
    ValidationResult(passed: false, violations: vs);

void main() {
  late MockReflectionAi mockAi;
  late ReflectionDraft draft;
  late ContextPack pack;

  setUpAll(() {
    registerFallbackValue(ContextPack());
  });

  setUp(() {
    mockAi = MockReflectionAi();
    draft = ReflectionDraft(eventDescription: '事件描述', tags: const ['t']);
    pack = ContextPack(memories: [], photos: [], tasks: [], summaries: []);
  });

  group('ReflectionService.generate 测试用例', () {
    test('1. 首次合规 → passed；ai 调用 1 次', () async {
      final summary = _makeSummary('1');
      when(() => mockAi.generate(
                eventDescription: any(named: 'eventDescription'),
                emotion: any(named: 'emotion'),
                actionTaken: any(named: 'actionTaken'),
                result: any(named: 'result'),
                tags: any(named: 'tags'),
                pack: any(named: 'pack'),
              ))
          .thenAnswer((_) async =>
              ReflectionAiResult(summary: summary, rawOutput: 'RAW'));
      final service = ReflectionService(
          reflectionAi: mockAi, validator: (s, p) => _vrPassed());
      final res = await service.generate(draft: draft, pack: pack);
      expect(res.outcome, GenerationOutcome.passed);
      expect(res.summary, isNotNull);
      verify(() => mockAi.generate(
            eventDescription: any(named: 'eventDescription'),
            emotion: any(named: 'emotion'),
            actionTaken: any(named: 'actionTaken'),
            result: any(named: 'result'),
            tags: any(named: 'tags'),
            pack: any(named: 'pack'),
          )).called(1);
    });

    test('2. 首次 V2 违规、二次合规 → passed；ai 调用 2 次；第二次输入含违规说明', () async {
      final s1 = _makeSummary('v2-1');
      final s2 = _makeSummary('v2-2');
      int seq = 0;
      when(() => mockAi.generate(
            eventDescription: any(named: 'eventDescription'),
            emotion: any(named: 'emotion'),
            actionTaken: any(named: 'actionTaken'),
            result: any(named: 'result'),
            tags: any(named: 'tags'),
            pack: any(named: 'pack'),
          )).thenAnswer((inv) async {
        seq++;
        final ed =
            inv.namedArguments[const Symbol('eventDescription')] as String?;
        if (seq == 1) {
          return ReflectionAiResult(summary: s1, rawOutput: 'RAW');
        } else {
          expect(ed, contains('V2'));
          return ReflectionAiResult(summary: s2, rawOutput: 'RAW');
        }
      });

      int vcall = 0;
      final service = ReflectionService(
          reflectionAi: mockAi,
          validator: (s, p) {
            vcall++;
            if (vcall == 1) {
              return _vrFailed([Violation(rule: 'V2', detail: '黑名单词：性格')]);
            }
            return _vrPassed();
          });
      final res = await service.generate(draft: draft, pack: pack);
      expect(res.outcome, GenerationOutcome.passed);
      verify(() => mockAi.generate(
            eventDescription: any(named: 'eventDescription'),
            emotion: any(named: 'emotion'),
            actionTaken: any(named: 'actionTaken'),
            result: any(named: 'result'),
            tags: any(named: 'tags'),
            pack: any(named: 'pack'),
          )).called(2);
    });

    test('3. 三次违规 → needsManualConfirm；attempts 长度 3', () async {
      final s1 = _makeSummary('a');
      when(() => mockAi.generate(
                eventDescription: any(named: 'eventDescription'),
                emotion: any(named: 'emotion'),
                actionTaken: any(named: 'actionTaken'),
                result: any(named: 'result'),
                tags: any(named: 'tags'),
                pack: any(named: 'pack'),
              ))
          .thenAnswer(
              (_) async => ReflectionAiResult(summary: s1, rawOutput: 'RAW'));
      final service = ReflectionService(
          reflectionAi: mockAi,
          validator: (s, p) =>
              _vrFailed([Violation(rule: 'V2', detail: '违规')]));
      final res = await service.generate(draft: draft, pack: pack);
      expect(res.outcome, GenerationOutcome.needsManualConfirm);
      expect(res.attempts.length, 3);
    });

    test('4. AiParseException 后二次合规 → passed，attempts[0].rule == V0', () async {
      final s2 = _makeSummary('ok');
      int call = 0;
      when(() => mockAi.generate(
            eventDescription: any(named: 'eventDescription'),
            emotion: any(named: 'emotion'),
            actionTaken: any(named: 'actionTaken'),
            result: any(named: 'result'),
            tags: any(named: 'tags'),
            pack: any(named: 'pack'),
          )).thenAnswer((_) async {
        call++;
        if (call == 1) {
          throw AiParseException('parse fail', 'raw');
        }
        return ReflectionAiResult(summary: s2, rawOutput: 'RAW');
      });
      final service = ReflectionService(
          reflectionAi: mockAi, validator: (s, p) => _vrPassed());
      final res = await service.generate(draft: draft, pack: pack);
      expect(res.outcome, GenerationOutcome.passed);
      expect(res.attempts.isNotEmpty, isTrue);
      expect(res.attempts.first.rule, 'V0');
    });

    test('5. 网络异常 → aiError；attempts 为空；ai 调用 1 次', () async {
      when(() => mockAi.generate(
            eventDescription: any(named: 'eventDescription'),
            emotion: any(named: 'emotion'),
            actionTaken: any(named: 'actionTaken'),
            result: any(named: 'result'),
            tags: any(named: 'tags'),
            pack: any(named: 'pack'),
          )).thenThrow(AiNetworkException('net'));
      final service = ReflectionService(
          reflectionAi: mockAi, validator: (s, p) => _vrPassed());
      final res = await service.generate(draft: draft, pack: pack);
      expect(res.outcome, GenerationOutcome.aiError);
      expect(res.attempts, isEmpty);
      verify(() => mockAi.generate(
            eventDescription: any(named: 'eventDescription'),
            emotion: any(named: 'emotion'),
            actionTaken: any(named: 'actionTaken'),
            result: any(named: 'result'),
            tags: any(named: 'tags'),
            pack: any(named: 'pack'),
          )).called(1);
    });

    test('6. 空 ContextPack 也能正常调用', () async {
      final s = _makeSummary('ok6');
      when(() => mockAi.generate(
                eventDescription: any(named: 'eventDescription'),
                emotion: any(named: 'emotion'),
                actionTaken: any(named: 'actionTaken'),
                result: any(named: 'result'),
                tags: any(named: 'tags'),
                pack: any(named: 'pack'),
              ))
          .thenAnswer(
              (_) async => ReflectionAiResult(summary: s, rawOutput: 'RAW'));
      final service = ReflectionService(
          reflectionAi: mockAi, validator: (s, p) => _vrPassed());
      final res = await service.generate(draft: draft, pack: ContextPack());
      expect(res.outcome, GenerationOutcome.passed);
    });

    test('7. 多违规同一次 → 全部进 attempts', () async {
      final s = _makeSummary('multi');
      when(() => mockAi.generate(
                eventDescription: any(named: 'eventDescription'),
                emotion: any(named: 'emotion'),
                actionTaken: any(named: 'actionTaken'),
                result: any(named: 'result'),
                tags: any(named: 'tags'),
                pack: any(named: 'pack'),
              ))
          .thenAnswer(
              (_) async => ReflectionAiResult(summary: s, rawOutput: 'RAW'));
      final service = ReflectionService(
          reflectionAi: mockAi,
          validator: (s, p) => _vrFailed([
                Violation(rule: 'V2', detail: '违规1'),
                Violation(rule: 'V3', detail: '违规2')
              ]));
      final res = await service.generate(draft: draft, pack: pack);
      expect(res.attempts.length, 6);
    });

    test('8. passed 时 summary 非空、lastRawOutput 为 null', () async {
      final s = _makeSummary('ok8');
      when(() => mockAi.generate(
                eventDescription: any(named: 'eventDescription'),
                emotion: any(named: 'emotion'),
                actionTaken: any(named: 'actionTaken'),
                result: any(named: 'result'),
                tags: any(named: 'tags'),
                pack: any(named: 'pack'),
              ))
          .thenAnswer(
              (_) async => ReflectionAiResult(summary: s, rawOutput: 'RAW'));
      final service = ReflectionService(
          reflectionAi: mockAi, validator: (s, p) => _vrPassed());
      final res = await service.generate(draft: draft, pack: pack);
      expect(res.summary, isNotNull);
      expect(res.lastRawOutput, isNull); // passed 路径不填 raw
    });

    test('9. needsManualConfirm 时 outcome 正确', () async {
      final s = _makeSummary('ok9');
      when(() => mockAi.generate(
                eventDescription: any(named: 'eventDescription'),
                emotion: any(named: 'emotion'),
                actionTaken: any(named: 'actionTaken'),
                result: any(named: 'result'),
                tags: any(named: 'tags'),
                pack: any(named: 'pack'),
              ))
          .thenAnswer(
              (_) async => ReflectionAiResult(summary: s, rawOutput: 'RAW'));
      final service = ReflectionService(
          reflectionAi: mockAi,
          validator: (s, p) => _vrFailed([Violation(rule: 'V2', detail: 'x')]));
      final res = await service.generate(draft: draft, pack: pack);
      expect(res.outcome, GenerationOutcome.needsManualConfirm);
    });

    test('10. aiError 时 summary 为 null', () async {
      when(() => mockAi.generate(
            eventDescription: any(named: 'eventDescription'),
            emotion: any(named: 'emotion'),
            actionTaken: any(named: 'actionTaken'),
            result: any(named: 'result'),
            tags: any(named: 'tags'),
            pack: any(named: 'pack'),
          )).thenThrow(AiApiException('api'));
      final service = ReflectionService(
          reflectionAi: mockAi, validator: (s, p) => _vrPassed());
      final res = await service.generate(draft: draft, pack: pack);
      expect(res.outcome, GenerationOutcome.aiError);
      expect(res.summary, isNull);
    });

    test('11. validator 抛异常 → 返回 aiError（不崩溃）', () async {
      final s = _makeSummary('ok11');
      when(() => mockAi.generate(
                eventDescription: any(named: 'eventDescription'),
                emotion: any(named: 'emotion'),
                actionTaken: any(named: 'actionTaken'),
                result: any(named: 'result'),
                tags: any(named: 'tags'),
                pack: any(named: 'pack'),
              ))
          .thenAnswer(
              (_) async => ReflectionAiResult(summary: s, rawOutput: 'RAW'));
      final service = ReflectionService(
          reflectionAi: mockAi,
          validator: (s, p) {
            throw Exception('validator fail');
          });
      final res = await service.generate(draft: draft, pack: pack);
      expect(res.outcome, GenerationOutcome.aiError);
    });
  });
}
