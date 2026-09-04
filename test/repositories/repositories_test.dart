import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/models/summary.dart';
import 'package:ai_life_recorder/models/trend.dart';
import 'package:ai_life_recorder/models/theme.dart';
import 'package:ai_life_recorder/constants/enums.dart';

void main() {
  late Repositories repos;
  setUp(() {
    repos = Repositories.inMemory();
  });
  test('内存 upsert 与 getById 覆盖行为', () async {
    final m1 = Memory(
        id: 'mem-x',
        title: '标题',
        content: '内容1',
        createdAt: DateTime.now().toUtc());
    await repos.memories.upsert(m1);
    final m2 = m1.copyWith(content: '内容2');
    await repos.memories.upsert(m2);
    final got = await repos.memories.getById('mem-x');
    expect(got, isNotNull);
    expect(got!.content, equals('内容2'));
  });
  test('memory list 按 tags 过滤（任一命中）', () async {
    final a = Memory(
        id: 'mem-a',
        title: 'A',
        content: 'c',
        tags: ['沟通', '项目'],
        createdAt: DateTime.now().toUtc());
    final b = Memory(
        id: 'mem-b',
        title: 'B',
        content: 'c',
        tags: ['学习'],
        createdAt: DateTime.now().toUtc());
    await repos.memories.upsert(a);
    await repos.memories.upsert(b);
    final res = await repos.memories.list(tags: ['沟通']);
    expect(res.length, equals(1));
    expect(res.first.id, equals('mem-a'));
  });
  test('memory list keyword 匹配 title 或 content', () async {
    final m = Memory(
        id: 'mem-k',
        title: '会议纪要',
        content: '讨论项目进度',
        createdAt: DateTime.now().toUtc());
    await repos.memories.upsert(m);
    final r1 = await repos.memories.list(keyword: '会议');
    final r2 = await repos.memories.list(keyword: '进度');
    expect(r1.isNotEmpty, isTrue);
    expect(r2.isNotEmpty, isTrue);
  });
  test('memory list 时间范围过滤', () async {
    final now = DateTime.now().toUtc();
    final mOld = Memory(
        id: 'mem-old',
        title: '旧',
        content: 'x',
        createdAt: now.subtract(const Duration(days: 10)));
    final mNew =
        Memory(id: 'mem-new', title: '新', content: 'y', createdAt: now);
    await repos.memories.upsert(mOld);
    await repos.memories.upsert(mNew);
    final res = await repos.memories.list(
        from: now.subtract(const Duration(days: 1)),
        to: now.add(const Duration(days: 1)));
    expect(res.any((e) => e.id == 'mem-new'), isTrue);
    expect(res.any((e) => e.id == 'mem-old'), isFalse);
  });
  test('photo listByRange 边界包含', () async {
    final now = DateTime.now().toUtc();
    final p1 = Photo(
        id: 'photo-1',
        localPath: '/p1',
        takenAt: now.subtract(const Duration(days: 1)),
        createdAt: now,
        summaryConfirmed: false);
    final p2 = Photo(
        id: 'photo-2',
        localPath: '/p2',
        takenAt: now,
        createdAt: now,
        summaryConfirmed: false);
    await repos.photos.upsert(p1);
    await repos.photos.upsert(p2);
    final res = await repos.photos
        .listByRange(now.subtract(const Duration(days: 1)), now);
    expect(res.length, equals(2));
  });
  test('photo confirmSummary 更新标记', () async {
    final p = Photo(
        id: 'photo-c',
        localPath: '/p',
        takenAt: DateTime.now().toUtc(),
        createdAt: DateTime.now().toUtc(),
        summaryConfirmed: false);
    await repos.photos.upsert(p);
    await repos.photos.confirmSummary('photo-c');
    final got = (await repos.photos.listByRange(
            DateTime.now().toUtc().subtract(const Duration(days: 1)),
            DateTime.now().toUtc().add(const Duration(days: 1))))
        .firstWhere((e) => e.id == 'photo-c');
    expect(got.summaryConfirmed, isTrue);
  });
  test('task listByStatus 与 listByCategory', () async {
    final t1 = Task(
        id: 'task-a',
        title: 'A',
        category: TaskCategory.communication,
        priority: TaskPriority.medium,
        repeatRule: RepeatRule.none,
        status: TaskStatus.todo,
        createdAt: DateTime.now().toUtc());
    final t2 = Task(
        id: 'task-b',
        title: 'B',
        category: TaskCategory.learning,
        priority: TaskPriority.low,
        repeatRule: RepeatRule.none,
        status: TaskStatus.done,
        createdAt: DateTime.now().toUtc());
    await repos.tasks.upsert(t1);
    await repos.tasks.upsert(t2);
    final s = await repos.tasks.listByStatus(TaskStatus.todo);
    final c = await repos.tasks.listByCategory(TaskCategory.learning);
    expect(s.length, equals(1));
    expect(c.length, equals(1));
  });
  test('task updateFeedback 只更新 feedback 字段', () async {
    final t = Task(
        id: 'task-f',
        title: 'F',
        category: TaskCategory.project,
        priority: TaskPriority.high,
        repeatRule: RepeatRule.none,
        status: TaskStatus.inProgress,
        createdAt: DateTime.now().toUtc());
    await repos.tasks.upsert(t);
    final fb = TaskFeedback(
        completedTime: DateTime.now().toUtc(),
        executionDurationMinutes: 45,
        behaviorImprovement: <String>['改进1']);
    await repos.tasks.updateFeedback('task-f', fb);
    final got = await repos.tasks.getById('task-f');
    expect(got, isNotNull);
    expect(got!.feedback.executionDurationMinutes, equals(45));
    expect(got.feedback.behaviorImprovement.length, equals(1));
  });
  test('summary getByPeriod 匹配 type 与 period_start', () async {
    final ps = DateTime.utc(2024, 8, 1);
    final s = Summary(
        id: 'sum-1',
        type: SummaryType.monthly,
        periodStart: ps,
        periodEnd: ps.add(const Duration(days: 30)),
        createdAt: DateTime.now().toUtc());
    await repos.summaries.upsert(s);
    final got = await repos.summaries.getByPeriod(SummaryType.monthly, ps);
    expect(got, isNotNull);
    expect(got!.id, equals('sum-1'));
  });
  test('trend upsertByName 覆盖同名', () async {
    final t1 = Trend(
        id: 'tr-1',
        trendName: '趋势A',
        category: 'cat',
        score: 1.0,
        direction: ThemeDirection.improving,
        weight: 1.0,
        updatedAt: DateTime.now().toUtc());
    final t2 = Trend(
        id: 'tr-2',
        trendName: '趋势A',
        category: 'cat',
        score: 2.0,
        direction: ThemeDirection.worsening,
        weight: 2.0,
        updatedAt: DateTime.now().toUtc());
    await repos.trends.upsertByName(t1);
    await repos.trends.upsertByName(t2);
    final all = await repos.trends.listAll();
    expect(all.length, equals(1));
    expect(all.first.score, equals(2.0));
  });
  test('theme upsertByName 覆盖同名', () async {
    final a = ThemeItem(
        id: 'th-1',
        themeName: '主题A',
        weight: 1.0,
        direction: ThemeDirection.stable,
        updatedAt: DateTime.now().toUtc());
    final b = ThemeItem(
        id: 'th-2',
        themeName: '主题A',
        weight: 2.0,
        direction: ThemeDirection.improving,
        updatedAt: DateTime.now().toUtc());
    await repos.themes.upsertByName(a);
    await repos.themes.upsertByName(b);
    final all = await repos.themes.listAll();
    expect(all.length, equals(1));
    expect(all.first.weight, equals(2.0));
  });
  test('tasks list 时间范围过滤', () async {
    final now = DateTime.now().toUtc();
    final tOld = Task(
        id: 'task-old',
        title: 'old',
        category: TaskCategory.habit,
        priority: TaskPriority.low,
        repeatRule: RepeatRule.none,
        status: TaskStatus.todo,
        createdAt: now.subtract(const Duration(days: 10)));
    final tNew = Task(
        id: 'task-new',
        title: 'new',
        category: TaskCategory.habit,
        priority: TaskPriority.low,
        repeatRule: RepeatRule.none,
        status: TaskStatus.todo,
        createdAt: now);
    await repos.tasks.upsert(tOld);
    await repos.tasks.upsert(tNew);
    final res = await repos.tasks.list(
        from: now.subtract(const Duration(days: 1)),
        to: now.add(const Duration(days: 1)));
    expect(res.any((e) => e.id == 'task-new'), isTrue);
    expect(res.any((e) => e.id == 'task-old'), isFalse);
  });
  test('多条 memory 与 task 混合操作稳定性', () async {
    final now = DateTime.now().toUtc();
    for (var i = 0; i < 5; i++) {
      await repos.memories.upsert(Memory(
          id: 'm$i',
          title: 't$i',
          content: 'c$i',
          createdAt: now.subtract(Duration(days: i))));
      await repos.tasks.upsert(Task(
          id: 'tk$i',
          title: 'tk$i',
          category: TaskCategory.communication,
          priority: TaskPriority.medium,
          repeatRule: RepeatRule.none,
          status: TaskStatus.todo,
          createdAt: now.subtract(Duration(days: i))));
    }
    final mems = await repos.memories.list();
    final tks = await repos.tasks.listByCategory(TaskCategory.communication);
    expect(mems.length, greaterThanOrEqualTo(5));
    expect(tks.length, greaterThanOrEqualTo(5));
  });
}
