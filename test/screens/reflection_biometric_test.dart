import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/providers/note_provider.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/providers/task_provider.dart';
import 'package:ai_life_recorder/providers/reflection_provider.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/services/task_service.dart';
import 'package:ai_life_recorder/services/biometric_gate.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/screens/home/home_screen.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_list_screen.dart';
import 'package:ai_life_recorder/services/reflection_service.dart';
import 'package:ai_life_recorder/ai/reflection_ai.dart';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/utils/validator.dart';

class _FakeGate implements BiometricGate {
  final bool result;
  int calls = 0;
  _FakeGate(this.result);
  @override
  Future<BiometricResult> authenticate() async {
    calls++;
    if (result) return const BiometricResult.success();
    return const BiometricResult.failure('验证未通过或已取消');
  }
}

Widget _wrap({required BiometricGate gate, Repositories? repos}) {
  final r = repos ?? Repositories.inMemory();
  return MultiProvider(
    providers: [
      Provider<Repositories>.value(value: r),
      ChangeNotifierProvider<MemoryProvider>(
          create: (ctx) =>
              MemoryProvider(repository: ctx.read<Repositories>().memories)),
      ChangeNotifierProvider<PhotoProvider>(
          create: (ctx) =>
              PhotoProvider(repository: ctx.read<Repositories>().photos)),
      ChangeNotifierProvider<NoteProvider>(
          create: (ctx) =>
              NoteProvider(repository: ctx.read<Repositories>().notes)),
      ChangeNotifierProvider<TaskProvider>(
        create: (ctx) => TaskProvider(
          repository: ctx.read<Repositories>().tasks,
          service: TaskService(repository: ctx.read<Repositories>().tasks),
        ),
      ),
      ChangeNotifierProvider<ReflectionProvider>(
        create: (ctx) => ReflectionProvider(
          repos: ctx.read<Repositories>(),
          service: ReflectionService(
            reflectionAi: ReflectionAi(client: AiClient()),
            validator: validate,
          ),
        ),
      ),
    ],
    child: MaterialApp(
      home: HomeScreen(
        onNavigateToTab: (_) {},
        reflectionRepository: r.reflections,
        biometricGate: gate,
      ),
    ),
  );
}

void main() {
  setUpAll(() async {
    await initializeDateFormatting('zh_CN');
  });

  testWidgets('生物识别失败 → 不进入反思列表', (tester) async {
    final gate = _FakeGate(false);
    final repos = Repositories.inMemory();
    await repos.reflections.upsert(Reflection(
      id: 'refl-1',
      eventDescription: '测试反思事件内容',
      createdAt: DateTime.now().toUtc(),
    ));
    await tester.pumpWidget(_wrap(gate: gate, repos: repos));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.textContaining('测试反思事件'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.textContaining('测试反思事件').first);
    await tester.pumpAndSettle();
    expect(gate.calls, 1);
    expect(find.byType(ReflectionListScreen), findsNothing);
    // 失败必须提示原因（不能没反应）
    expect(find.text('验证未通过或已取消'), findsOneWidget);
  });

  testWidgets('生物识别成功 → 正常进入反思列表', (tester) async {
    final gate = _FakeGate(true);
    final repos = Repositories.inMemory();
    await repos.reflections.upsert(Reflection(
      id: 'refl-1',
      eventDescription: '测试反思事件内容',
      createdAt: DateTime.now().toUtc(),
    ));
    await tester.pumpWidget(_wrap(gate: gate, repos: repos));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.textContaining('测试反思事件'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.textContaining('测试反思事件').first);
    await tester.pumpAndSettle();
    expect(gate.calls, 1);
    expect(find.byType(ReflectionListScreen), findsOneWidget);
  });
}
