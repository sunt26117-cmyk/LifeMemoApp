import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/growth/growth_engine.dart';
import 'package:ai_life_recorder/growth/multi_type_growth_combiner.dart';

TypePeriodCompletion _t(String id, double rate, {double? difficulty}) =>
    TypePeriodCompletion(
        typeId: id, completionRate: rate, difficultyMultiplier: difficulty);

void main() {
  const combiner = MultiTypeGrowthCombiner();

  test('无数据周期被跳过，不产生输出点、不影响后续', () {
    final periods = <PeriodActivitySnapshot>[
      const PeriodActivitySnapshot(<TypePeriodCompletion>[]), // 空
      PeriodActivitySnapshot([_t('a', 0.8)]),
      const PeriodActivitySnapshot(<TypePeriodCompletion>[]), // 空
      PeriodActivitySnapshot([_t('a', 0.85)]),
    ];
    final result = combiner.combine(periods);
    expect(result.length, 2);
    // periodIndex 对齐原始输入下标
    expect(result[0].periodIndex, 1);
    expect(result[1].periodIndex, 3);
    // 跳过的空周期不应产生"暴跌"：第二次 0.85 应为上升
    expect(result[1].update.direction, GrowthDirection.up);
  });

  test('多活跃类型取算术平均完成率', () {
    final periods = <PeriodActivitySnapshot>[
      PeriodActivitySnapshot([_t('a', 0.6), _t('b', 0.8)]), // 平均 0.7
      PeriodActivitySnapshot([_t('a', 0.8), _t('b', 0.9)]), // 平均 0.85
    ];
    final result = combiner.combine(periods);
    expect(result.length, 2);
    expect(result[0].activeTypeCount, 2);
    // 0.7 → 0.85 是上升；首个周期内部验证平均后分数变化方向
    expect(result[1].update.direction, GrowthDirection.up);
    // 验证 0.7 单点（无上一期）：delta 由维持力决定 = 20*(0.7-0.7)=0（持平）
    expect(result[0].update.delta, closeTo(0.0, 0.001));
  });

  test('难度倍率取平均且只放大正向', () {
    // 单类型难易对比：hard(1.3) 平均后等效 1.15（与 1.0 的 normal 混合）
    final periodsNormal = <PeriodActivitySnapshot>[
      PeriodActivitySnapshot([_t('a', 0.6)]),
      PeriodActivitySnapshot([_t('a', 0.9)]),
    ];
    final periodsHard = <PeriodActivitySnapshot>[
      PeriodActivitySnapshot([_t('a', 0.6)]),
      PeriodActivitySnapshot([_t('a', 0.9, difficulty: 1.3)]),
    ];
    final r1 = combiner.combine(periodsNormal);
    final r2 = combiner.combine(periodsHard);
    // 上升阶段 hard 平均倍率 1.3 → 正向奖励更大
    expect(r2[1].update.delta, greaterThan(r1[1].update.delta));
  });

  test('单类型与多类型同完成率时合并完成率口径一致', () {
    final single = <PeriodActivitySnapshot>[
      PeriodActivitySnapshot([_t('a', 0.7)]),
    ];
    final multi = <PeriodActivitySnapshot>[
      PeriodActivitySnapshot([_t('a', 0.7), _t('b', 0.7), _t('c', 0.7)]),
    ];
    final rs = combiner.combine(single);
    final rm = combiner.combine(multi);
    // 都是 0.7 → delta 相同（维持力 = 0）
    expect(rs[0].update.delta, closeTo(0.0, 0.001));
    expect(rm[0].update.delta, closeTo(0.0, 0.001));
    expect(rm[0].activeTypeCount, 3);
  });

  test('全部为空 → 空结果', () {
    final result = combiner.combine(<PeriodActivitySnapshot>[
      const PeriodActivitySnapshot(<TypePeriodCompletion>[]),
      const PeriodActivitySnapshot(<TypePeriodCompletion>[]),
    ]);
    expect(result, isEmpty);
  });
}
