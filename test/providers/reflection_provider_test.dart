// test/providers/reflection_provider_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:ai_life_recorder/providers/reflection_provider.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/repositories/memory_repository.dart';
import 'package:ai_life_recorder/repositories/photo_repository.dart';
import 'package:ai_life_recorder/repositories/task_repository.dart';
import 'package:ai_life_recorder/repositories/summary_repository.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/models/summary.dart';

class _MockRepositories extends Mock implements Repositories {}

class _MockMemoryRepo extends Mock implements MemoryRepository {}

class _MockPhotoRepo extends Mock implements PhotoRepository {}

class _MockTaskRepo extends Mock implements TaskRepository {}

class _MockSummaryRepo extends Mock implements SummaryRepository {}

void main() {
  group('ReflectionProvider 测试', () {
    late _MockRepositories repos;
    late _MockMemoryRepo memoryRepo;
    late _MockPhotoRepo photoRepo;
    late _MockTaskRepo taskRepo;
    late _MockSummaryRepo summaryRepo;
    late ReflectionProvider provider;

    setUp(() {
      repos = _MockRepositories();
      memoryRepo = _MockMemoryRepo();
      photoRepo = _MockPhotoRepo();
      taskRepo = _MockTaskRepo();
      summaryRepo = _MockSummaryRepo();

      when(() => repos.memories).thenReturn(memoryRepo);
      when(() => repos.photos).thenReturn(photoRepo);
      when(() => repos.tasks).thenReturn(taskRepo);
      when(() => repos.summaries).thenReturn(summaryRepo);

      provider = ReflectionProvider(repos: repos);
    });

    test('草稿为空或 1 字时 isValid=false，searchContext 抛 StateError', () async {
      expect(provider.draft.isValid, isFalse);
      await expectLater(provider.searchContext(), throwsA(isA<StateError>()));

      provider.updateDraft(eventDescription: '我');
      expect(provider.draft.isValid, isFalse);
      await expectLater(provider.searchContext(), throwsA(isA<StateError>()));
    });

    test('检索返回 2 记忆 + 1 照片 → state=contextLoaded，pack 包含对应数量', () async {
      provider.updateDraft(eventDescription: '一次测试事件', tags: const ['tag1']);

      final now = DateTime.now();
      final mem1 =
          Memory(id: 'm1', title: '记忆一', content: '内容', tags: const ['tag1']);
      final mem2 =
          Memory(id: 'm2', title: '记忆二', content: '内容', tags: const ['tag2']);
      final photo = Photo(
        id: 'p1',
        localPath: '/tmp/p1.jpg',
        takenAt: now,
        aiSummary: 's',
        summaryConfirmed: true,
        tags: const ['tag1'],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: now,
      );

      when(() =>
              memoryRepo.list(from: any(named: 'from'), to: any(named: 'to')))
          .thenAnswer((_) async => [mem1, mem2]);
      when(() => photoRepo.listByRange(any(), any()))
          .thenAnswer((_) async => [photo]);
      when(() => summaryRepo.listAll()).thenAnswer((_) async => <Summary>[]);
      when(() => taskRepo.listByStatus(null)).thenAnswer((_) async => <Task>[]);

      await provider.searchContext();

      expect(provider.state, ReflectionEditState.contextLoaded);
      final pack = provider.pack;
      expect(pack, isNotNull);
      expect(pack!.memories.length, greaterThanOrEqualTo(2));
      expect(pack.photos.length, greaterThanOrEqualTo(1));
    });

    test('无匹配数据 → state=contextEmpty', () async {
      provider.updateDraft(eventDescription: '另一事件');

      when(() =>
              memoryRepo.list(from: any(named: 'from'), to: any(named: 'to')))
          .thenAnswer((_) async => <Memory>[]);
      when(() => photoRepo.listByRange(any(), any()))
          .thenAnswer((_) async => <Photo>[]);
      when(() => summaryRepo.listAll()).thenAnswer((_) async => <Summary>[]);
      when(() => taskRepo.listByStatus(null)).thenAnswer((_) async => <Task>[]);

      await provider.searchContext();

      expect(provider.state, ReflectionEditState.contextEmpty);
      final pack = provider.pack!;
      expect(pack.memories.isEmpty, isTrue);
      expect(pack.photos.isEmpty, isTrue);
      expect(pack.tasks.isEmpty, isTrue);
      expect(pack.summaries.isEmpty, isTrue);
    });

    test('select/deselect Memory 与 Photo 操作更新集合', () {
      provider.selectMemory('m1');
      expect(provider.selectedMemoryIds.contains('m1'), isTrue);
      provider.deselectMemory('m1');
      expect(provider.selectedMemoryIds.contains('m1'), isFalse);

      provider.selectPhoto('p1');
      expect(provider.selectedPhotoIds.contains('p1'), isTrue);
      provider.deselectPhoto('p1');
      expect(provider.selectedPhotoIds.contains('p1'), isFalse);
    });

    test('reset() 清空草稿/状态/包/选择', () {
      provider.updateDraft(eventDescription: '事件X', tags: const ['t']);
      provider.selectMemory('m1');
      provider.selectPhoto('p1');

      provider.reset();

      expect(provider.draft.eventDescription, '');
      expect(provider.state, ReflectionEditState.editing);
      expect(provider.pack, isNull);
      expect(provider.selectedMemoryIds, isEmpty);
      expect(provider.selectedPhotoIds, isEmpty);
    });
  });
}
