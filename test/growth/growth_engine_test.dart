// test/growth/growth_engine_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/growth/growth_engine.dart';

void main() {
  const engine = GrowthEngine();

  GrowthUpdateResult step(GrowthState state, double rate) =>
      engine.computeNext(previousState: state, completionRate: rate);

  group('维持力：同完成率重复，围绕70%稳定线', () {
    test('70% -> 70% delta = 0（既不上升也不下降）', () {
      final s1 = step(GrowthState.initial(), 0.70);
      final s2 = step(s1.newState, 0.70);
      expect(s2.delta, closeTo(0.0, 0.001));
      expect(s2.direction, GrowthDirection.flat);
    });

    test('低于70%持平：完成率越低，下降越明显', () {
      final r40 = step(step(GrowthState.initial(), 0.40).newState, 0.40);
      final r60 = step(step(GrowthState.initial(), 0.60).newState, 0.60);
      expect(r40.delta, closeTo(-6.0, 0.001));
      expect(r60.delta, closeTo(-2.0, 0.001));
      expect(r40.delta, lessThan(r60.delta)); // 40%的下降幅度比60%更大（更负）
    });

    test('高于70%持平：完成率越高，上升越明显', () {
      final r80 = step(step(GrowthState.initial(), 0.80).newState, 0.80);
      final r90 = step(step(GrowthState.initial(), 0.90).newState, 0.90);
      expect(r80.delta, closeTo(2.0, 0.001));
      expect(r90.delta, closeTo(4.0, 0.001));
      expect(r90.delta, greaterThan(r80.delta));
    });
  });

  group('情况 E：达到100%', () {
    test('90% -> 100% 明显上升', () {
      final s1 = step(GrowthState.initial(), 0.90);
      final s2 = step(s1.newState, 1.00);
      expect(s2.direction, GrowthDirection.up);
      expect(s2.delta, closeTo(18.0, 0.01));
    });

    test('连续100%：每次仍小幅向上，但衰减且有下限（不会变成0）', () {
      var state = step(GrowthState.initial(), 0.90).newState;
      state = step(state, 1.00).newState; // 首次100%
      final repeats = <double>[];
      for (var i = 0; i < 8; i++) {
        final r = step(state, 1.00);
        repeats.add(r.delta);
        state = r.newState;
        expect(r.delta, greaterThan(0)); // 永远不会变成水平线（0）
        expect(r.delta, lessThanOrEqualTo(6.0)); // 不会超过未衰减的基础值
      }
      // 衰减是单调不增的，且最终收敛到一个大于0的下限，不会无限增长也不会归零
      for (var i = 1; i < repeats.length; i++) {
        expect(repeats[i], lessThanOrEqualTo(repeats[i - 1] + 0.001));
      }
      expect(repeats.last, closeTo(1.8, 0.05)); // 收敛到衰减下限
    });
  });

  test('90% -> 20% 明显下降', () {
    final s1 = step(GrowthState.initial(), 0.90);
    final s2 = step(s1.newState, 0.20);
    expect(s2.direction, GrowthDirection.down);
    expect(s2.delta, closeTo(-27.5, 0.01));
  });

  test('恢复序列 20->40->60->80：正反馈逐步增强', () {
    var state = GrowthState.initial();
    state = step(state, 0.20).newState; // 建立基线，不计入"恢复"叙事
    final r1 = step(state, 0.40);
    state = r1.newState;
    final r2 = step(state, 0.60);
    state = r2.newState;
    final r3 = step(state, 0.80);

    expect(r1.direction, GrowthDirection.up);
    expect(r2.direction, GrowthDirection.up);
    expect(r3.direction, GrowthDirection.up);
    // 每一步的正反馈都比上一步更明显
    expect(r2.delta, greaterThan(r1.delta));
    expect(r3.delta, greaterThan(r2.delta));
  });

  test('退步序列 90->60->40->20->20：幅度逐步加剧，且比同水平持平更差', () {
    var state = GrowthState.initial();
    state = step(state, 0.90).newState; // 基线
    final d1 = step(state, 0.60);
    state = d1.newState;
    final d2 = step(state, 0.40);
    state = d2.newState;
    final d3 = step(state, 0.20);
    state = d3.newState;
    final d4 = step(state, 0.20); // 20 -> 20，持平

    // 连续退步，幅度逐步加剧（负得更多）
    expect(d2.delta, lessThan(d1.delta));
    expect(d3.delta, lessThan(d2.delta));

    // 20 -> 20 应该比 60 -> 60 下降更多
    final flat60 = step(step(GrowthState.initial(), 0.60).newState, 0.60);
    expect(d4.delta, lessThan(flat60.delta));
  });

  test('GrowthScore 累计裁剪在 [-100, 100]，不会因单次波动越界', () {
    var state = GrowthState.initial();
    // 连续多期100%，验证不会超过100
    for (var i = 0; i < 50; i++) {
      state = step(state, 1.0).newState;
    }
    expect(state.score, lessThanOrEqualTo(100.0));

    // 连续多期0%，验证不会低于-100
    state = GrowthState.initial();
    for (var i = 0; i < 50; i++) {
      state = step(state, 0.0).newState;
    }
    expect(state.score, greaterThanOrEqualTo(-100.0));
  });

  test('难度只放大正向奖励，不放大惩罚', () {
    final base = step(step(GrowthState.initial(), 0.80).newState, 0.80);
    final hard = engine.computeNext(
      previousState: step(GrowthState.initial(), 0.80).newState,
      completionRate: 0.80,
      difficultyMultiplier: TaskDifficulty.hard.baseRewardMultiplier,
    );
    expect(hard.delta, greaterThan(base.delta)); // 困难任务同样表现，正向奖励更高

    final baseDown = step(step(GrowthState.initial(), 0.90).newState, 0.20);
    final hardDown = engine.computeNext(
      previousState: step(GrowthState.initial(), 0.90).newState,
      completionRate: 0.20,
      difficultyMultiplier: TaskDifficulty.hard.baseRewardMultiplier,
    );
    expect(hardDown.delta, closeTo(baseDown.delta, 0.001)); // 惩罚不受难度影响
  });

  test('computeSeries 能一次性推进一整段序列', () {
    final results = engine.computeSeries(
      initialState: GrowthState.initial(),
      completionRates: [0.20, 0.40, 0.60, 0.80],
    );
    expect(results.length, 4);
    expect(results.last.newState.lastCompletionRate, closeTo(0.80, 0.001));
  });
}
