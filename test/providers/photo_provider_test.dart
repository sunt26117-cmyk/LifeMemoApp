import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/repositories/photo_repository.dart';
import 'package:ai_life_recorder/utils/context_retrieval.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/models/summary.dart';

class _FakePhotoRepository extends InMemoryPhotoRepository {}

void main() {
  group('PhotoProvider 功能测试', () {
    late InMemoryPhotoRepository repo;
    late PhotoProvider provider;
    setUp(() {
      repo = _FakePhotoRepository();
      provider = PhotoProvider(repository: repo);
    });
    test('addPhoto 后 photos 增加且按 takenAt 倒序', () async {
      final p1 = Photo(
        id: '1',
        localPath: '/tmp/1.jpg',
        takenAt: DateTime(2024, 1, 1, 10, 0),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      final p2 = Photo(
        id: '2',
        localPath: '/tmp/2.jpg',
        takenAt: DateTime(2024, 1, 2, 9, 0),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      await provider.addPhoto(p1);
      await provider.addPhoto(p2);
      final photos = provider.photos;
      expect(photos.length, 2);
      expect(photos.first.id, '2');
      expect(photos.last.id, '1');
    });
    test('setSummary：aiSummary 更新且 summaryConfirmed=false（待确认）', () async {
      final p = Photo(
        id: 's1',
        localPath: '/tmp/s1.jpg',
        takenAt: DateTime(2024, 2, 2),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      await provider.addPhoto(p);
      await provider.setSummary(p.id, '这是 AI 摘要');
      final updated = provider.photos.firstWhere((e) => e.id == p.id);
      expect(updated.aiSummary, '这是 AI 摘要');
      expect(updated.summaryConfirmed, isFalse);
    });
    test('confirmSummary：调用后 summaryConfirmed=true', () async {
      final p = Photo(
        id: 'c1',
        localPath: '/tmp/c1.jpg',
        takenAt: DateTime(2024, 3, 3),
        aiSummary: '初始摘要',
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      await provider.addPhoto(p);
      await provider.confirmSummary(p.id);
      final updated = provider.photos.firstWhere((e) => e.id == p.id);
      expect(updated.summaryConfirmed, isTrue);
    });
    test(
        'generateSummary：提供 summaryGenerator 时生成并 summaryConfirmed=false；generator 抛异常不崩溃（summary 为 null）',
        () async {
      final repo2 = _FakePhotoRepository();
      Future<String> successGenerator(Photo photo) async => '生成的摘要';
      final providerWithGen =
          PhotoProvider(repository: repo2, summaryGenerator: successGenerator);
      final p = Photo(
        id: 'g1',
        localPath: '/tmp/g1.jpg',
        takenAt: DateTime(2024, 4, 4),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      await providerWithGen.addPhoto(p);
      await providerWithGen.generateSummary(p);
      final updated = providerWithGen.photos.firstWhere((e) => e.id == p.id);
      expect(updated.aiSummary, '生成的摘要');
      expect(updated.summaryConfirmed, isFalse);
      Future<String> throwGenerator(Photo photo) async {
        throw Exception('生成失败');
      }

      final repo3 = _FakePhotoRepository();
      final providerWithThrow =
          PhotoProvider(repository: repo3, summaryGenerator: throwGenerator);
      final p2 = Photo(
        id: 'g2',
        localPath: '/tmp/g2.jpg',
        takenAt: DateTime(2024, 4, 5),
        aiSummary: null,
        summaryConfirmed: false,
        tags: const [],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      await providerWithThrow.addPhoto(p2);
      await providerWithThrow.generateSummary(p2);
      final updated2 =
          providerWithThrow.photos.firstWhere((e) => e.id == p2.id);
      expect(updated2.aiSummary == null || updated2.aiSummary == '', isTrue);
      expect(updated2.summaryConfirmed, isFalse);
    });
    test('集成：ContextPack.photos 只含已确认的照片', () async {
      final confirmed = Photo(
        id: 'conf',
        localPath: '/tmp/conf.jpg',
        takenAt: DateTime(2024, 5, 1),
        aiSummary: '已确认摘要',
        summaryConfirmed: true,
        tags: const ['tag1'],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      final unconfirmed = Photo(
        id: 'unconf',
        localPath: '/tmp/unconf.jpg',
        takenAt: DateTime(2024, 5, 2),
        aiSummary: '未确认摘要',
        summaryConfirmed: false,
        tags: const ['tag1'],
        relatedMemoryIds: const [],
        metadata: const {},
        createdAt: DateTime.now(),
      );
      final pack = buildContextPack(
        eventDescription: '测试事件',
        emotion: null,
        actionTaken: null,
        result: null,
        tags: const ['tag1'],
        memories: const <Memory>[],
        photos: [confirmed, unconfirmed],
        tasks: const <Task>[],
        summaries: const <Summary>[],
      );
      expect(pack.photos.length, 1);
      expect(pack.photos.first.id, confirmed.id);
    });
  });
}
