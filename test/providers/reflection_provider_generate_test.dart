// test/providers/reflection_provider_generate_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:ai_life_recorder/providers/reflection_provider.dart';
import 'package:ai_life_recorder/services/reflection_service.dart';
import 'package:ai_life_recorder/models/reflection_draft.dart';
import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/models/generation_result.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';

class MockReflectionService extends Mock implements ReflectionService {}

void main() {
  setUpAll(() {
    registerFallbackValue(ReflectionDraft(eventDescription: ''));
    registerFallbackValue(ContextPack());
  });
  group('ReflectionProvider.generateReflection 流程测试', () {
    late MockReflectionService mockService;
    late Repositories repos;
    late ReflectionProvider provider;
    setUp(() {
      mockService = MockReflectionService();
      repos = Repositories.inMemory();
      provider = ReflectionProvider(repos: repos, service: mockService);
    });
    test('草稿无效或 service 为 null 时直接返回不改变状态', () async {
      await provider.generateReflection();
      expect(provider.submitState, isNull);
      final providerNoService = ReflectionProvider(repos: repos, service: null);
      providerNoService.updateDraft(eventDescription: '有效内容');
      await providerNoService.generateReflection();
      expect(providerNoService.submitState, isNull);
    });
    test('AI 返回 passed 时 submitState=success 且仓库包含该反思且 isUserConfirmed=false',
        () async {
      provider.updateDraft(eventDescription: '事件描述');
      final genSummary = ReflectionSummary(
        eventSummary: '生成内容',
        nextSuggestion: '下一步',
      );
      final result = ReflectionGenerationResult(
        outcome: GenerationOutcome.passed,
        summary: genSummary,
      );
      when(() => mockService.generate(
          draft: any(named: 'draft'),
          pack: any(named: 'pack'))).thenAnswer((_) async => result);
      await provider.generateReflection();
      expect(provider.submitState, ReflectionSubmitState.success);
      final list = await repos.reflections.list();
      expect(list, isNotEmpty);
      final saved = list.first;
      expect(saved.eventDescription, contains('事件描述'));
      expect(saved.isUserConfirmed, isFalse);
    });
    test('AI 返回 needsManualConfirm 时 submitState=needsManualConfirm 且未落库',
        () async {
      provider.updateDraft(eventDescription: '事件描述');
      final genSummary = ReflectionSummary(
        eventSummary: '需要人工确认',
        nextSuggestion: '下一步',
      );
      final result = ReflectionGenerationResult(
        outcome: GenerationOutcome.needsManualConfirm,
        summary: genSummary,
      );
      when(() => mockService.generate(
          draft: any(named: 'draft'),
          pack: any(named: 'pack'))).thenAnswer((_) async => result);
      await provider.generateReflection();
      expect(provider.submitState, ReflectionSubmitState.needsManualConfirm);
      final list = await repos.reflections.list();
      expect(list, isEmpty);
    });
    test('AI 返回 aiError 时 submitState=aiError；retryGenerate 后成功变为 success',
        () async {
      provider.updateDraft(eventDescription: '事件描述');
      final errorResult = ReflectionGenerationResult(
        outcome: GenerationOutcome.aiError,
      );
      final successSummary = ReflectionSummary(
        eventSummary: '重试成功',
        nextSuggestion: '下一步',
      );
      final successResult = ReflectionGenerationResult(
        outcome: GenerationOutcome.passed,
        summary: successSummary,
      );
      when(() => mockService.generate(
          draft: any(named: 'draft'),
          pack: any(named: 'pack'))).thenAnswer((_) async => errorResult);
      await provider.generateReflection();
      expect(provider.submitState, ReflectionSubmitState.aiError);
      when(() => mockService.generate(
          draft: any(named: 'draft'),
          pack: any(named: 'pack'))).thenAnswer((_) async => successResult);
      await provider.retryGenerate();
      expect(provider.submitState, ReflectionSubmitState.success);
      final list = await repos.reflections.list();
      expect(list, isNotEmpty);
    });
    test(
        'saveReflection 合并 citations 与 selectedMemoryIds；userConfirmedPath=false 时 isUserConfirmed=false',
        () async {
      provider.updateDraft(eventDescription: '事件描述');
      provider.selectMemory('m1');
      provider.selectMemory('m2');
      final citations = Citations(memoryIds: ['m2', 'm3']);
      final summary = ReflectionSummary(
        eventSummary: '带引用',
        nextSuggestion: '下一步',
        citations: citations,
      );
      await provider.saveReflection(summary: summary);
      final list = await repos.reflections.list();
      expect(list.length, greaterThanOrEqualTo(1));
      final saved = list.last;
      final related = saved.relatedMemoryIds.toSet();
      expect(related.containsAll({'m1', 'm2', 'm3'}), isTrue);
      expect(saved.isUserConfirmed, isFalse);
    });
    test('confirmAndSave 设置 is_user_confirmed=true 且保存后 reset', () async {
      provider.updateDraft(eventDescription: '事件描述');
      provider.selectMemory('mA');
      final edited = ReflectionSummary(
        eventSummary: '确认并保存',
        nextSuggestion: '下一步',
      );
      await provider.confirmAndSave(editedSummary: edited);
      final list = await repos.reflections.list();
      expect(list, isNotEmpty);
      final saved = list.last;
      expect(saved.isUserConfirmed, isTrue);
      expect(provider.draft.eventDescription, isEmpty);
      expect(provider.submitState, isNull);
    });
  });
}
