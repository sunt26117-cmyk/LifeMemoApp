import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/growth/weekly_completion_builder.dart';
import 'package:ai_life_recorder/growth/multi_type_growth_combiner.dart';

void main() {
  // 用固定日期构造跨周边界（2026 年 9 月：9/1 周二、9/7 周一、9/14 周一）
  CheckInDayEntry e(String typeId, int month, int day) =>
      CheckInDayEntry(typeId: typeId, date: DateTime(2026, month, day));

  test('第一周打过的类型即活跃并完成 → 100%', () {
    // 9/1(周二) 打 学习+运动 → 该周活跃={学习,运动}，都完成 → 1.0
    final snaps = buildWeeklySnapshots([
      e('study', 9, 1),
      e('sport', 9, 1),
    ]);
    expect(snaps.length, 1);
    expect(snaps[0].activeTypes.length, 2);
    expect(snaps[0].combinedCompletionRate, closeTo(1.0, 0.001));
  });

  test('第二周只打一个 → 活跃集含上周类型，完成率 1/2 = 0.5', () {
    final snaps = buildWeeklySnapshots([
      e('study', 9, 1),
      e('sport', 9, 1), // 第 1 周：study+sport
      e('study', 9, 8), // 第 2 周(9/7起)：只打 study
    ]);
    expect(snaps.length, 2);
    // 第 2 周活跃 = {study, sport}，完成 study → 0.5
    expect(snaps[1].combinedCompletionRate, closeTo(0.5, 0.001));
  });

  test('新增类型当周计入活跃且完成，不拖累已坚持的类型', () {
    final snaps = buildWeeklySnapshots([
      e('study', 9, 1),
      e('study', 9, 8), // 第 1-2 周只 study
      e('study', 9, 15),
      e('meditate', 9, 15), // 第 3 周新增 meditate（study 也坚持）
    ]);
    expect(snaps.length, 3);
    // 第 3 周活跃 = {study, meditate}，都完成 → 1.0，新增类型不拖累
    expect(snaps[2].combinedCompletionRate, closeTo(1.0, 0.001));
  });

  test('新增类型当周加入活跃集，若老类型中断则完成率下降（符合口径）', () {
    final snaps = buildWeeklySnapshots([
      e('study', 9, 1),
      e('study', 9, 8),
      e('meditate', 9, 15), // 第 3 周新增 meditate，study 中断
    ]);
    expect(snaps.length, 3);
    // 第 3 周活跃 = {study, meditate}，只完成 meditate → 0.5
    expect(snaps[2].combinedCompletionRate, closeTo(0.5, 0.001));
  });

  test('跨周边界：周日与下周一属于不同周', () {
    // 2026-09-06 是周日，09-07 是周一
    final snaps = buildWeeklySnapshots([
      e('study', 9, 6),
      e('study', 9, 7),
    ]);
    expect(snaps.length, 2); // 两个不同周
  });

  test('空输入 → 空结果', () {
    expect(buildWeeklySnapshots(<CheckInDayEntry>[]), isEmpty);
  });

  test('接入 combiner：周快照可直接生成成长序列', () {
    const combiner = MultiTypeGrowthCombiner();
    final snaps = buildWeeklySnapshots([
      e('study', 9, 1),
      e('sport', 9, 1),
      e('study', 9, 8), // 第2周 0.5
      e('study', 9, 15),
      e('sport', 9, 15), // 第3周 1.0
    ]);
    final points = combiner.combine(snaps);
    expect(points.length, 3);
    // 第 3 周上升（1.0 > 0.5）
    expect(points[2].update.direction.toString(), isNotEmpty);
    // score 应 > 0（前面都是正完成率推动）
    expect(points[2].update.newState.score, greaterThan(0));
  });

  group('休眠机制（连续缺卡≥4周移出活跃分母，再打卡唤醒）', () {
    CheckInDayEntry e(String typeId, DateTime d) =>
        CheckInDayEntry(typeId: typeId, date: d);

    test('连续缺卡4周后第5周起移出分母，不再拖累完成率', () {
      // type_a 只在第1周打，type_b 每周都打（撑起时间轴到第6周）
      final w1 = DateTime(2026, 1, 5);
      final w2 = DateTime(2026, 1, 12);
      final w3 = DateTime(2026, 1, 19);
      final w4 = DateTime(2026, 1, 26);
      final w5 = DateTime(2026, 2, 2);
      final w6 = DateTime(2026, 2, 9);
      final snaps = buildWeeklySnapshots([
        e('a', w1),
        e('b', w1),
        e('b', w2),
        e('b', w3),
        e('b', w4),
        e('b', w5),
        e('b', w6),
      ], dormantThresholdWeeks: 4);
      expect(snaps.length, 6);
      // 第1周：a+b 都完成 → 1.0
      expect(snaps[0].combinedCompletionRate, closeTo(1.0, 0.001));
      // 第2~5周：a 缺卡但未满4周仍在分母 → 0.5
      for (var i = 1; i <= 4; i++) {
        expect(snaps[i].combinedCompletionRate, closeTo(0.5, 0.001),
            reason: 'week ${i + 1}');
      }
      // 第6周：a 已缺卡满4周（w2,w3,w4,w5）→ 休眠移出分母，只剩 b → 1.0
      expect(snaps[5].activeTypes.length, 1);
      expect(snaps[5].combinedCompletionRate, closeTo(1.0, 0.001));
    });

    test('休眠后再次打卡立即唤醒重入分母', () {
      final w1 = DateTime(2026, 1, 5);
      final w7 = DateTime(2026, 2, 16);
      final snaps = buildWeeklySnapshots([
        e('a', w1),
        e('a', w7), // 第7周再次打卡
      ], dormantThresholdWeeks: 4);
      // 快照：w1(a打)=1 + w2-w5(a=0各1)=4 + w6无活跃跳过 + w7(a唤醒)=1 → 共6
      expect(snaps.length, 6);
      // w7 a 唤醒重入分母且完成 → 1.0
      final last = snaps.last;
      expect(last.activeTypes.length, 1);
      expect(last.combinedCompletionRate, closeTo(1.0, 0.001));
    });

    test('全部类型休眠时空周跳过，不影响后续新类型', () {
      final w1 = DateTime(2026, 1, 5);
      final w8 = DateTime(2026, 2, 23);
      final snaps = buildWeeklySnapshots([
        e('a', w1),
        e('c', w8), // 全新类型在第8周出现
      ], dormantThresholdWeeks: 4);
      // a 在第6周休眠，第7周空周跳过，第8周 c 出现 → 最后一组只有 c
      final last = snaps.last;
      expect(last.activeTypes.length, 1);
      expect(last.combinedCompletionRate, closeTo(1.0, 0.001));
    });
  });
}
