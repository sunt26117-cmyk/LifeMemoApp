import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:ai_life_recorder/ai/summary_ai.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/models/summary.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/services/annual_service.dart';

class MockSummaryAi extends Mock implements SummaryAi {}

void main() {
  late Repositories repos;
  late MockSummaryAi summaryAi;
  late AnnualService service;

  final Map<String, dynamic> annualAiResult = <String, dynamic>{
    'annualTheme': '成长与平衡',
    'highlights': <String>['完成重要项目', '完成一次旅行'],
    'behaviorTrend': '更专注于长期目标',
    'moodTrend': '总体稳定，偶有波动',
    'lifeRhythm': '生活节奏更加规律',
    'annualReflection': '这一年我学会了更好地管理时间。',
    'nextYearSuggestions': <String>['保持每周阅读', '保持规律运动'],
  };

  setUpAll(() {
    registerFallbackValue(SummaryType.yearly);
  });

  setUp(() {
    repos = Repositories.inMemory();
    summaryAi = MockSummaryAi();
    service = AnnualService(
      repos: repos,
      summaryAi: summaryAi,
      nowMillis: () => 1700000000000,
    );
    when(() => summaryAi.generate(
          type: any(named: 'type'),
          aggregate: any(named: 'aggregate'),
        )).thenAnswer((_) async => Map<String, dynamic>.from(annualAiResult));
  });

  test('空数据：所有趋势为 0，truncated=false', () async {
    final DateTime start = DateTime(2024, 1, 1);
    final DateTime end = DateTime(2024, 12, 31, 23, 59, 59);

    final Map<String, dynamic> chart = await service.buildChartData(
      periodStart: start,
      periodEnd: end,
    );

    expect((chart['months'] as List).length, 12);
    expect(chart['memoryTrend'], everyElement(0));
    expect(chart['photoTrend'], everyElement(0));
    expect(chart['truncated'], false);
    final Map<String, dynamic> mood =
        chart['moodTrend'] as Map<String, dynamic>;
    expect(mood.length, Emotion.values.length);
  });

  test('fixture 数据：月度计数正确', () async {
    final DateTime start = DateTime(2024, 1, 1);
    final DateTime end = DateTime(2024, 12, 31, 23, 59, 59);

    await repos.memories.upsert(Memory(
      id: 'm1',
      title: '记忆1',
      content: '三月记录',
      tags: const ['读书'],
      aiSummary: '摘要1',
      createdAt: DateTime(2024, 3, 5),
    ));
    await repos.memories.upsert(Memory(
      id: 'm2',
      title: '记忆2',
      content: '三月记录2',
      tags: const ['读书', '旅行'],
      aiSummary: '摘要2',
      createdAt: DateTime(2024, 3, 20),
    ));
    await repos.memories.upsert(Memory(
      id: 'm3',
      title: '记忆3',
      content: '五月记录',
      tags: const ['运动'],
      aiSummary: '摘要3',
      createdAt: DateTime(2024, 5, 10),
    ));

    await repos.photos.upsert(Photo(
      id: 'p1',
      localPath: '/p1.jpg',
      takenAt: DateTime(2024, 4, 2),
      aiSummary: '照片摘要',
      summaryConfirmed: true,
      tags: const ['旅行'],
      createdAt: DateTime(2024, 4, 2),
    ));

    await repos.reflections.upsert(Reflection(
      id: 'r1',
      eventDescription: '三月反思',
      emotion: Emotion.happy.value,
      aiSummary: null,
      createdAt: DateTime(2024, 3, 6),
    ));
    await repos.reflections.upsert(Reflection(
      id: 'r2',
      eventDescription: '三月反思2',
      emotion: Emotion.happy.value,
      aiSummary: null,
      createdAt: DateTime(2024, 3, 15),
    ));
    await repos.reflections.upsert(Reflection(
      id: 'r3',
      eventDescription: '四月反思',
      emotion: Emotion.calm.value,
      aiSummary: null,
      createdAt: DateTime(2024, 4, 10),
    ));

    final Map<String, dynamic> chart = await service.buildChartData(
      periodStart: start,
      periodEnd: end,
    );

    final List<String> months = List<String>.from(chart['months'] as List);
    final int marchIndex = months.indexWhere((m) => m.endsWith('-03'));
    final int aprilIndex = months.indexWhere((m) => m.endsWith('-04'));
    final int mayIndex = months.indexWhere((m) => m.endsWith('-05'));

    final List<int> memoryTrend = List<int>.from(chart['memoryTrend'] as List);
    final List<int> photoTrend = List<int>.from(chart['photoTrend'] as List);
    final Map<String, List<int>> moodTrend = (chart['moodTrend'] as Map)
        .map((k, v) => MapEntry(k as String, List<int>.from(v as List)));

    expect(memoryTrend[marchIndex], 2);
    expect(memoryTrend[mayIndex], 1);
    expect(photoTrend[aprilIndex], 1);
    expect(moodTrend[Emotion.happy.value]![marchIndex], 2);
    expect(moodTrend[Emotion.calm.value]![aprilIndex], 1);
  });

  test('generateAnnualSummary：映射与落库', () async {
    final DateTime start = DateTime(2024, 1, 1);
    final DateTime end = DateTime(2024, 12, 31, 23, 59, 59);

    final Summary summary = await service.generateAnnualSummary(
      periodStart: start,
      periodEnd: end,
    );

    expect(summary.type, SummaryType.yearly);
    expect(summary.content, '这一年我学会了更好地管理时间。');
    expect(summary.themes, <String>['成长与平衡']);
    expect(summary.highlights, contains('完成重要项目'));
    expect(summary.taskSuggestions, contains('保持每周阅读'));
    expect(summary.trends['annualTheme'], '成长与平衡');
    expect(summary.chartData['annual'], isA<Map<String, dynamic>>());

    final List<Summary> saved = await repos.summaries.listAll();
    expect(saved.length, 1);
    expect(saved.single.type, SummaryType.yearly);
  });

  test('generateAnnualSummary persist=false 不落库', () async {
    final DateTime start = DateTime(2024, 1, 1);
    final DateTime end = DateTime(2024, 12, 31, 23, 59, 59);

    await service.generateAnnualSummary(
      periodStart: start,
      periodEnd: end,
      persist: false,
    );

    final List<Summary> saved = await repos.summaries.listAll();
    expect(saved, isEmpty);
  });
}
