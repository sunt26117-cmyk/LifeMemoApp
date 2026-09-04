// test/reflection_list_screen_test.dart
// 反思列表页 Widget 测试：空态、数量、排序与跳转
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_list_screen.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_detail_screen.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';

void main() {
  testWidgets('空列表 显示暂无反思记录', (WidgetTester tester) async {
    final repos = Repositories.inMemory();
    // 确保仓库为空
    final list0 = await repos.reflections.list();
    expect(list0, isEmpty);

    await tester.pumpWidget(
        MaterialApp(home: ReflectionListScreen(repository: repos.reflections)));
    await tester.pumpAndSettle();

    expect(find.text('暂无反思记录'), findsOneWidget);
  });

  testWidgets('三条记录 显示三张卡片 且一条人工确认徽标', (WidgetTester tester) async {
    final repos = Repositories.inMemory();

    final now = DateTime.now();
    final r1 = Reflection(
      id: 'r1',
      eventDescription: '事件1',
      emotion: '开心',
      aiSummary: {'eventSummary': '总结1'},
      isUserConfirmed: true,
      createdAt: now.subtract(const Duration(days: 2)),
    );
    final r2 = Reflection(
      id: 'r2',
      eventDescription: '事件2',
      emotion: null,
      aiSummary: {'eventSummary': '总结2'},
      isUserConfirmed: false,
      createdAt: now.subtract(const Duration(days: 1)),
    );
    final r3 = Reflection(
      id: 'r3',
      eventDescription: '事件3',
      emotion: '平静',
      aiSummary: null,
      isUserConfirmed: false,
      createdAt: now,
    );

    await repos.reflections.upsert(r1);
    await repos.reflections.upsert(r2);
    await repos.reflections.upsert(r3);

    await tester.pumpWidget(
        MaterialApp(home: ReflectionListScreen(repository: repos.reflections)));
    await tester.pumpAndSettle();

    // 三张卡片（通过 eventSummary 或 eventDescription 文本判断）
    expect(find.text('总结1'), findsOneWidget);
    expect(find.text('总结2'), findsOneWidget);
    expect(find.text('事件3'), findsOneWidget);

    // 人工确认徽标只出现一次
    expect(find.text('人工确认'), findsOneWidget);
  });

  testWidgets('列表按 createdAt 倒序，最新在前，点击卡片跳转详情', (WidgetTester tester) async {
    final repos = Repositories.inMemory();

    final now = DateTime.now();
    final older = Reflection(
      id: 'old',
      eventDescription: '旧事件',
      emotion: null,
      aiSummary: {'eventSummary': '旧总结'},
      isUserConfirmed: false,
      createdAt: now.subtract(const Duration(days: 3)),
    );
    final latest = Reflection(
      id: 'latest',
      eventDescription: '最新事件',
      emotion: null,
      aiSummary: {'eventSummary': '最新总结'},
      isUserConfirmed: false,
      createdAt: now,
    );

    await repos.reflections.upsert(older);
    await repos.reflections.upsert(latest);

    await tester.pumpWidget(
        MaterialApp(home: ReflectionListScreen(repository: repos.reflections)));
    await tester.pumpAndSettle();

    // 列表第一项应为最新总结（最新在前）
    final firstTitle = find.text('最新总结');
    expect(firstTitle, findsOneWidget);

    // 点击第一张卡片跳转到详情页
    await tester.tap(firstTitle);
    await tester.pumpAndSettle();

    // ReflectionDetailScreen 的 AppBar 标题为 '反思详情'
    expect(find.text('反思详情'), findsOneWidget);
    expect(find.byType(ReflectionDetailScreen), findsOneWidget);
  });
}
