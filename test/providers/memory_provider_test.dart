import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/ai/memory_ai.dart';
import 'package:ai_life_recorder/repositories/memory_repository.dart';

class MockMemoryAi extends Mock implements MemoryAi {}

void main() {
  late InMemoryMemoryRepository repo;
  late MockMemoryAi mockAi;
  late MemoryProvider provider;
  setUp(() {
    repo = InMemoryMemoryRepository();
    mockAi = MockMemoryAi();
    provider = MemoryProvider(repository: repo, memoryAi: mockAi);
  });
  test('保存后 memories 增加且倒序（最新在前）', () async {
    await provider.save(content: '第一条', tags: ['a']);
    await Future.delayed(const Duration(milliseconds: 10));
    await provider.save(content: '第二条', tags: ['b']);
    final list = provider.memories;
    expect(list.length, 2);
    expect(list.first.content, '第二条');
    expect(list.last.content, '第一条');
  });
  test(
      'save 带 memoryAi: 状态流转 none->generating->success 且调用 generateSummary 与 updateSummary',
      () async {
    when(() => mockAi.generateSummary(
        content: any(named: 'content'),
        tags: any(named: 'tags'))).thenAnswer((_) async => '摘要');
    expect(provider.summaryStatusOf('any'), MemorySummaryStatus.none);
    final saved = await provider.save(content: '需要摘要的内容', tags: ['tag1']);
    await Future.delayed(const Duration(milliseconds: 50));
    expect(provider.summaryStatusOf(saved!.id), MemorySummaryStatus.success);
    final mem = provider.memories.firstWhere((m) => m.id == saved.id);
    expect(mem.aiSummary, isNotNull);
    expect(mem.aiSummary, '摘要');
    verify(() => mockAi.generateSummary(
        content: any(named: 'content'), tags: any(named: 'tags'))).called(1);
  });
  test('save 时 MemoryAi 抛异常 -> summaryStatus 为 failed 且不崩溃，记忆已写入', () async {
    when(() => mockAi.generateSummary(
        content: any(named: 'content'),
        tags: any(named: 'tags'))).thenThrow(Exception('ai error'));
    final saved = await provider.save(content: '异常内容', tags: ['t']);
    await Future.delayed(const Duration(milliseconds: 50));
    expect(provider.summaryStatusOf(saved!.id), MemorySummaryStatus.failed);
    expect(provider.memories.any((m) => m.id == saved.id), true);
  });
  test('retrySummary: failed 状态调用后成功 -> success', () async {
    when(() => mockAi.generateSummary(
        content: any(named: 'content'),
        tags: any(named: 'tags'))).thenThrow(Exception('first fail'));
    final saved = await provider.save(content: '需要重试', tags: ['t']);
    await Future.delayed(const Duration(milliseconds: 50));
    expect(provider.summaryStatusOf(saved!.id), MemorySummaryStatus.failed);
    when(() => mockAi.generateSummary(
        content: any(named: 'content'),
        tags: any(named: 'tags'))).thenAnswer((_) async => '重试后摘要');
    await provider.retrySummary(saved.id);
    await Future.delayed(const Duration(milliseconds: 50));
    expect(provider.summaryStatusOf(saved.id), MemorySummaryStatus.success);
    final mem = provider.memories.firstWhere((m) => m.id == saved.id);
    expect(mem.aiSummary, '重试后摘要');
  });
  test('过滤：setKeyword / toggleTag / clearFilters 生效', () async {
    await provider.save(content: '包含关键词 apple', tags: ['fruit']);
    await provider.save(content: '其他内容', tags: ['other']);
    provider.setKeyword('apple');
    expect(provider.memories.length, 1);
    expect(provider.memories.first.content.contains('apple'), true);
    provider.clearFilters();
    expect(provider.memories.length, 2);
    provider.toggleTag('fruit');
    expect(provider.memories.length, 1);
    expect(provider.memories.first.tags.contains('fruit'), true);
    provider.clearFilters();
    expect(provider.memories.length, 2);
  });
  test('delete 后列表移除', () async {
    final saved = await provider.save(content: '待删除', tags: []);
    expect(saved, isNotNull);
    final id = saved!.id;
    expect(provider.memories.any((m) => m.id == id), true);
    await provider.delete(id);
    expect(provider.memories.any((m) => m.id == id), false);
  });
  test('updateSummary 修改 aiSummary 并通知', () async {
    final saved = await provider.save(content: '更新摘要测试', tags: []);
    expect(provider.summaryStatusOf(saved!.id), isNotNull);
    await provider.updateSummary(saved.id, '手动摘要');
    final mem = provider.memories.firstWhere((m) => m.id == saved.id);
    expect(mem.aiSummary, '手动摘要');
  });
}
