import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/screens/checkin/check_in_manage_screen.dart';

void main() {
  late Repositories repos;

  setUp(() async {
    repos = Repositories.inMemory();
    await repos.checkInTypes.seedDefaults();
  });

  Future<void> pumpScreen(WidgetTester tester) async {
    await tester.pumpWidget(
      Provider<Repositories>.value(
        value: repos,
        child: const MaterialApp(home: CheckInManageScreen()),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('停用类型后 listEnabled 不再包含该类型（选择面板不含）', (tester) async {
    await pumpScreen(tester);
    expect(await repos.checkInTypes.listEnabled(), hasLength(5));
    await tester.tap(find.byType(Switch).first);
    await tester.pumpAndSettle();
    expect(await repos.checkInTypes.listEnabled(), hasLength(4));
  });

  testWidgets('编辑对话框 label 超过 3 字校验失败；中文 1-3 字可保存', (tester) async {
    await pumpScreen(tester);
    await tester.tap(find.byIcon(Icons.add));
    await tester.pumpAndSettle();

    // 弹窗内只有两个 TextFormField：第 0 个符号、第 1 个名称
    await tester.enterText(find.byType(TextFormField).at(0), '🎯');
    await tester.enterText(find.byType(TextFormField).at(1), '目标打卡');
    await tester.tap(find.text('保存'));
    await tester.pumpAndSettle();
    expect(find.text('请输入 1-3 个中文字符'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).at(1), '目标');
    await tester.tap(find.text('保存'));
    await tester.pumpAndSettle();
    final all = await repos.checkInTypes.listAll();
    expect(all.any((t) => t.label == '目标'), isTrue);
  });
}