// test/screens/reflection_edit_screen_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_edit_screen.dart';
import 'package:ai_life_recorder/providers/reflection_provider.dart';
import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';

class _MockRepositories extends Mock implements Repositories {}

class _TestReflectionProvider extends ReflectionProvider {
  bool calledSearch = false;
  ReflectionEditState _testState = ReflectionEditState.editing;
  ContextPack? _testPack;

  _TestReflectionProvider({required super.repos});

  @override
  ReflectionEditState get state => _testState;

  @override
  ContextPack? get pack => _testPack;

  @override
  Future<void> searchContext() async {
    calledSearch = true;
    await Future<void>.delayed(const Duration(milliseconds: 10));
    _testPack = ContextPack(
      memories: [
        ContextItem(
            id: 'm1', title: '记忆一', date: DateTime.now(), tags: const ['a'])
      ],
      photos: [],
      tasks: [],
      summaries: [],
    );
    _testState = ReflectionEditState.contextLoaded;
    notifyListeners();
  }
}

void main() {
  group('ReflectionEditScreen Widget 测试', () {
    late _MockRepositories repos;
    late _TestReflectionProvider provider;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      repos = _MockRepositories();
      provider = _TestReflectionProvider(repos: repos);
    });

    Future<void> pumpWidget(WidgetTester tester) async {
      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<ReflectionProvider>.value(value: provider),
          ],
          child: const MaterialApp(home: ReflectionEditScreen()),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('必填为空时「查找相关」按钮禁用', (tester) async {
      await pumpWidget(tester);
      final findButton = find.widgetWithText(ElevatedButton, '查找相关记忆/照片');
      expect(findButton, findsOneWidget);
      final ElevatedButton btn = tester.widget<ElevatedButton>(findButton);
      expect(btn.onPressed, isNull);
    });

    testWidgets('输入合法内容后按钮可用并调用 provider.searchContext', (tester) async {
      await pumpWidget(tester);
      final eventField = find.byType(TextField).first;
      await tester.enterText(eventField, '测试事件');
      await tester.pumpAndSettle();

      final findButton = find.widgetWithText(ElevatedButton, '查找相关记忆/照片');
      expect(findButton, findsOneWidget);
      final ElevatedButton btn = tester.widget<ElevatedButton>(findButton);
      expect(btn.onPressed, isNotNull);

      await tester.tap(findButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 20));

      expect(provider.calledSearch, isTrue);
      await tester.pumpAndSettle();
      expect(find.text('相关记忆'), findsOneWidget);
    });

    testWidgets('「生成反思」按钮在草稿无效时禁用', (tester) async {
      await pumpWidget(tester);
      final genButton = find.widgetWithText(ElevatedButton, '生成反思');
      expect(genButton, findsOneWidget);
      final ElevatedButton btn = tester.widget<ElevatedButton>(genButton);
      expect(btn.onPressed, isNull);
    });

    testWidgets('contextLoaded 后侧栏渲染组标题', (tester) async {
      await pumpWidget(tester);
      provider.searchContext();
      await tester.pump(const Duration(milliseconds: 20));
      await tester.pumpAndSettle();
      expect(find.text('相关记忆'), findsOneWidget);
      expect(find.text('记忆一'), findsOneWidget);
    });
  });
}
