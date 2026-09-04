import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'package:ai_life_recorder/main.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/providers/note_provider.dart';
import 'package:ai_life_recorder/providers/task_provider.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/services/task_service.dart';
import 'package:ai_life_recorder/ai/summary_ai.dart';
import 'package:ai_life_recorder/ai/ai_client.dart';
import 'package:ai_life_recorder/services/summary_service.dart';
import 'package:ai_life_recorder/providers/reflection_provider.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/services/annual_service.dart';
import 'package:ai_life_recorder/services/reflection_service.dart';
import 'package:ai_life_recorder/ai/reflection_ai.dart';
import 'package:ai_life_recorder/utils/validator.dart';

Widget _buildApp() {
  return MultiProvider(
    providers: [
      Provider<Repositories>.value(value: Repositories.inMemory()),
      ChangeNotifierProvider<MemoryProvider>(
        create: (ctx) =>
            MemoryProvider(repository: ctx.read<Repositories>().memories),
      ),
      ChangeNotifierProvider<PhotoProvider>(
        create: (ctx) =>
            PhotoProvider(repository: ctx.read<Repositories>().photos),
      ),
      ChangeNotifierProvider<NoteProvider>(
        create: (ctx) =>
            NoteProvider(repository: ctx.read<Repositories>().notes),
      ),
      ChangeNotifierProvider<AppState>(create: (_) => AppState()),
      ChangeNotifierProvider<TaskProvider>(
        create: (ctx) => TaskProvider(
          repository: ctx.read<Repositories>().tasks,
          service: TaskService(repository: ctx.read<Repositories>().tasks),
        ),
      ),
      Provider<SummaryService>(
        create: (ctx) => SummaryService(
          repos: ctx.read<Repositories>(),
          summaryAi: SummaryAi(client: AiClient()),
          nowMillis: () => DateTime.now().millisecondsSinceEpoch,
        ),
      ),
      Provider<AnnualService>(
        create: (ctx) => AnnualService(
          repos: ctx.read<Repositories>(),
          summaryAi: SummaryAi(client: AiClient()),
          nowMillis: () => DateTime.now().millisecondsSinceEpoch,
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
    child: const LifeRecorderApp(),
  );
}

void main() {
  setUpAll(() async {
    await initializeDateFormatting('zh_CN');
  });

  testWidgets('启动后显示底部 4 个 Tab', (tester) async {
    await tester.pumpWidget(_buildApp());
    await tester.pumpAndSettle();
    expect(find.text('今天'), findsWidgets);
    expect(find.text('记录'), findsWidgets);
    expect(find.text('任务'), findsWidgets);
    expect(find.text('回顾'), findsWidgets);
  });

  testWidgets('点击任务 Tab 显示任务列表页', (tester) async {
    await tester.pumpWidget(_buildApp());
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
          of: find.byType(NavigationBar), matching: find.text('任务')),
    );
    await tester.pumpAndSettle();
    // 任务页有时间分段（今天/即将到来/全部）
    expect(find.text('今天'), findsWidgets);
    expect(find.byType(FloatingActionButton), findsOneWidget);
  });

  testWidgets('记录 Tab 显示记录页', (tester) async {
    await tester.pumpWidget(_buildApp());
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
          of: find.byType(NavigationBar), matching: find.text('记录')),
    );
    await tester.pumpAndSettle();
    // 记录页分段（全部/文字）——方案A 起照片不再独立分段，配图随记录展示
    expect(find.text('全部'), findsWidgets);
    expect(find.text('文字'), findsWidgets);
    expect(find.text('照片'), findsNothing);
  });
}
