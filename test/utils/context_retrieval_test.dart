import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/utils/context_retrieval.dart';

void main() {
  group('上下文检索 测试', () {
    test('记忆按标签与时间排序与取舍正确', () {
      final now = DateTime.now().toUtc();
      final tags = ['工作', '沟通'];
      final m1 = Memory(
        id: 'm1',
        title: '重要沟通',
        content: '今天与客户沟通，讨论需求变更',
        tags: ['工作', '沟通'],
        aiSummary: '客户需求变更沟通',
        relatedMediaIds: [],
        createdAt: now.subtract(const Duration(days: 0)),
      );
      final m2 = Memory(
        id: 'm2',
        title: '近一天记录',
        content: '准备会议材料',
        tags: ['准备'],
        aiSummary: '会议准备',
        relatedMediaIds: [],
        createdAt: now.subtract(const Duration(days: 1)),
      );
      final m3 = Memory(
        id: 'm3',
        title: '无关记录',
        content: '周末看电影',
        tags: ['娱乐'],
        aiSummary: '电影',
        relatedMediaIds: [],
        createdAt: now.subtract(const Duration(days: 10)),
      );
      final pack = buildContextPack(
        eventDescription: '沟通准备',
        tags: tags,
        memories: [m1, m2, m3],
        photos: [],
        tasks: [],
        summaries: [],
      );
      expect(pack.memories.length, 2);
      expect(pack.memories.first.id, 'm1');
      expect(pack.memories.map((e) => e.id).contains('m3'), false);
    });
    test('无匹配 返回四类空数组 不报错', () {
      final pack = buildContextPack(
        eventDescription: '不存在的关键词',
        tags: ['不存在标签'],
        memories: [],
        photos: [],
        tasks: [],
        summaries: [],
      );
      expect(pack.memories, isEmpty);
      expect(pack.photos, isEmpty);
      expect(pack.tasks, isEmpty);
      expect(pack.summaries, isEmpty);
    });
    test('summary_confirmed=false 的照片永不出现', () {
      final now = DateTime.now().toUtc();
      final p1 = Photo(
        id: 'p1',
        localPath: '/tmp/1.jpg',
        takenAt: now,
        aiSummary: '和客户合影',
        summaryConfirmed: false,
        tags: ['工作'],
        createdAt: now,
      );
      final p2 = Photo(
        id: 'p2',
        localPath: '/tmp/2.jpg',
        takenAt: now,
        aiSummary: '会议现场',
        summaryConfirmed: true,
        tags: ['工作'],
        createdAt: now,
      );
      final pack = buildContextPack(
        eventDescription: '会议',
        tags: ['工作'],
        memories: [],
        photos: [p1, p2],
        tasks: [],
        summaries: [],
      );
      expect(pack.photos.length, 1);
      expect(pack.photos.first.id, 'p2');
    });
    test('每类超过5条时只留 top5', () {
      final now = DateTime.now().toUtc();
      final memories = <Memory>[];
      for (var i = 0; i < 7; i++) {
        memories.add(Memory(
          id: 'm$i',
          title: '记忆$i',
          content: i.isEven ? '沟通 记录 $i' : '其他 $i',
          tags: i < 3 ? ['沟通'] : ['无关'],
          aiSummary: '',
          relatedMediaIds: [],
          createdAt: now.subtract(Duration(days: i)),
        ));
      }
      final pack = buildContextPack(
        eventDescription: '沟通',
        tags: ['沟通'],
        memories: memories,
        photos: [],
        tasks: [],
        summaries: [],
      );
      expect(pack.memories.length, 5);
      expect(pack.memories.first.id, 'm0');
    });
    test('关键词提取 中文"沟通准备" 提取包含"沟通"、"准备"', () {
      final kws = extractKeywords('沟通准备');
      expect(kws.contains('沟通'), true);
      expect(kws.contains('准备'), true);
      expect(kws.length >= 2, true);
    });
  });
}
