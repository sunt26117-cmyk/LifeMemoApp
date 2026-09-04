// test/task_edit_screen_test.dart
// Widget 测试：TaskEditScreen 的关键交互（延期必填、预填、编辑保存保留 feedback）
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ai_life_recorder/models/task_prefill.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/providers/task_provider.dart';
import 'package:ai_life_recorder/services/task_service.dart';
import 'package:ai_life_recorder/screens/task/task_edit_screen.dart';

/// 辅助：按 labelText 查找 InputDecorator（TextFormField 的渲染层）
Finder _findTextFormFieldByLabel(String label) {
  return find.byWidgetPredicate((w) {
    if (w is InputDecorator) {
      final d = w.decoration;
      return d.labelText == label;
    }
    return false;
  }, description: 'InputDecorator with label "$label"');
}

void main() {
  testWidgets('延期未选类型提交被拒', (WidgetTester tester) async {
    final repos = Repositories.inMemory();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<Repositories>.value(value: repos),
          ChangeNotifierProvider<TaskProvider>(
            create: (ctx) => TaskProvider(
              repository: ctx.read<Repositories>().tasks,
              service: TaskService(repository: ctx.read<Repositories>().tasks),
            ),
          ),
        ],
        child: const MaterialApp(home: TaskEditScreen()),
      ),
    );

    await tester.pumpAndSettle();

    // 输入标题（通过 InputDecorator label 定位）
    final titleDecorator = _findTextFormFieldByLabel('标题');
    expect(titleDecorator, findsOneWidget);
    // 确保可见后输入
    await tester.ensureVisible(titleDecorator);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).first, '测试延期任务');
    await tester.pumpAndSettle();

    // 打开状态下拉（通过 DropdownButtonFormField 类型定位触发器）
    final dropdownTrigger = find.byType(DropdownButtonFormField<TaskStatus>);
    expect(dropdownTrigger, findsWidgets);
    await tester.ensureVisible(dropdownTrigger.first);
    await tester.pumpAndSettle();
    await tester.tap(dropdownTrigger.first);
    await tester.pumpAndSettle();

    // 选择“延期”菜单项（此时菜单项已布局）
    await tester.tap(find.text('延期').last);
    await tester.pumpAndSettle();

    // 确保保存按钮可见并点击
    final saveFinder = find.text('保存');
    await tester.ensureVisible(saveFinder);
    await tester.pumpAndSettle();
    await tester.tap(saveFinder);
    await tester.pumpAndSettle();

    // 应显示 SnackBar 提示并且仓库中无新增任务
    expect(find.text('延期需填写类型与原因'), findsOneWidget);
    final list = await repos.tasks.listByStatus(null);
    expect(list, isEmpty);
  });

  testWidgets('TaskPrefill 预填不落库，保存后落库', (WidgetTester tester) async {
    final repos = Repositories.inMemory();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<Repositories>.value(value: repos),
          ChangeNotifierProvider<TaskProvider>(
            create: (ctx) => TaskProvider(
              repository: ctx.read<Repositories>().tasks,
              service: TaskService(repository: ctx.read<Repositories>().tasks),
            ),
          ),
        ],
        child: MaterialApp(
          home: TaskEditScreen(
            prefill: TaskPrefill(
              title: '预填标题',
              description: '预填描述',
              sourceReflectionId: 'r1',
              defaultCategory: TaskCategory.learning,
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // 标题输入框应显示预填标题
    expect(find.text('预填标题'), findsWidgets);

    // 仓库应仍为空（预填不落库）
    var list = await repos.tasks.listByStatus(null);
    expect(list, isEmpty);

    // 确保保存按钮可见并点击
    final saveFinder = find.text('保存');
    await tester.ensureVisible(saveFinder);
    await tester.pumpAndSettle();
    await tester.tap(saveFinder);
    await tester.pumpAndSettle();

    // 保存后仓库应有一条记录，且标题为预填标题
    list = await repos.tasks.listByStatus(null);
    expect(list.length, equals(1));
    expect(list.first.title, equals('预填标题'));
  });

  testWidgets('编辑任务状态变更保留 feedback（完成时记录 completedTime）',
      (WidgetTester tester) async {
    final repos = Repositories.inMemory();
    final service = TaskService(repository: repos.tasks);

    // 构造并保存一个原始任务（未开始）
    final original = Task(
      id: 't-edit-1',
      title: '待完成任务',
      category: TaskCategory.planning,
      priority: TaskPriority.medium,
      repeatRule: RepeatRule.none,
      status: TaskStatus.todo,
      steps: const <TaskStep>[],
      createdAt: DateTime.now(),
      feedback: TaskFeedback(),
    );
    await repos.tasks.upsert(original);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<Repositories>.value(value: repos),
          ChangeNotifierProvider<TaskProvider>(
            create: (ctx) => TaskProvider(
                repository: ctx.read<Repositories>().tasks, service: service),
          ),
        ],
        child: MaterialApp(home: TaskEditScreen(task: original)),
      ),
    );

    await tester.pumpAndSettle();

    // 打开状态下拉并选择「已完成」
    final dropdownTrigger = find.byType(DropdownButtonFormField<TaskStatus>);
    expect(dropdownTrigger, findsWidgets);
    await tester.ensureVisible(dropdownTrigger.first);
    await tester.pumpAndSettle();
    await tester.tap(dropdownTrigger.first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('已完成').last);
    await tester.pumpAndSettle();

    // 填写行为改善（通过 InputDecorator label 定位），确保可见后输入
    final behaviorDecorator = _findTextFormFieldByLabel('行为改善（换行分隔）');
    expect(behaviorDecorator, findsOneWidget);
    await tester.ensureVisible(behaviorDecorator);
    await tester.pumpAndSettle();
    // 找到对应的 TextFormField 并输入（使用较稳定的索引）
    await tester.enterText(find.byType(TextFormField).at(3), '更主动沟通');
    await tester.pumpAndSettle();

    // 确保保存按钮可见并点击
    final saveFinder = find.text('保存');
    await tester.ensureVisible(saveFinder);
    await tester.pumpAndSettle();
    await tester.tap(saveFinder);
    await tester.pumpAndSettle();

    // 仓库中该任务应被更新，且 feedback.completedTime 不为 null
    final list = await repos.tasks.listByStatus(null);
    final saved = list.firstWhere((t) => t.id == 't-edit-1');
    expect(saved.feedback.completedTime, isNotNull);
  });
}
