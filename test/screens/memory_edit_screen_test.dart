import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mocktail/mocktail.dart';
import 'package:ai_life_recorder/screens/memory/memory_edit_screen.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/repositories/memory_repository.dart';
import 'package:ai_life_recorder/ai/memory_ai.dart';

class MockMemoryAi extends Mock implements MemoryAi {}

void main() {
  late InMemoryMemoryRepository repo;
  late MemoryProvider provider;
  late MockMemoryAi mockAi;
  setUp(() {
    repo = InMemoryMemoryRepository();
    mockAi = MockMemoryAi();
    provider = MemoryProvider(repository: repo, memoryAi: mockAi);
  });
  Future<void> pumpEditor(WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<Repositories>.value(value: Repositories.inMemory()),
          ChangeNotifierProvider<MemoryProvider>.value(value: provider),
        ],
        child: const MaterialApp(home: MemoryEditScreen()),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('正文为空时保存按钮禁用', (tester) async {
    await pumpEditor(tester);
    final saveBtn = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
    expect(saveBtn.onPressed, isNull);
  });
  testWidgets('输入正文后按钮可用并保存会写入 provider', (tester) async {
    when(() => mockAi.generateSummary(
        content: any(named: 'content'),
        tags: any(named: 'tags'))).thenAnswer((_) async => '摘要');
    await pumpEditor(tester);
    final contentField = find.byWidgetPredicate(
        (w) => w is TextField && w.decoration?.hintText == '记录点什么…');
    expect(contentField, findsOneWidget);
    await tester.enterText(contentField, '这是测试正文');
    await tester.pumpAndSettle();
    final saveBtnFinder = find.byType(ElevatedButton);
    expect(saveBtnFinder, findsOneWidget);
    var saveBtn = tester.widget<ElevatedButton>(saveBtnFinder);
    expect(saveBtn.onPressed, isNotNull);
    await tester.tap(saveBtnFinder);
    await tester.pumpAndSettle();
    expect(provider.memories.length, 1);
    expect(provider.memories.first.content, '这是测试正文');
  });
  testWidgets('标签组件可添加标签（输入文本后回车出现 Chip）', (tester) async {
    await pumpEditor(tester);
    final tagField = find.byWidgetPredicate(
        (w) => w is TextField && w.decoration?.hintText == '输入标签后回车添加');
    expect(tagField, findsOneWidget);
    await tester.enterText(tagField, '新标签');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(find.byType(InputChip), findsOneWidget);
    expect(find.text('新标签'), findsOneWidget);
  });
}
