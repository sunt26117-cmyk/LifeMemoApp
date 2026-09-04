import 'package:flutter_test/flutter_test.dart';

import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/theme.dart';
import 'package:ai_life_recorder/models/trend.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/services/task_service.dart';
import 'package:ai_life_recorder/services/trend_engine.dart';

TaskTransitionEvent _event({
  required String eventId,
  required String taskId,
  required String event,
  required double delta,
  required DateTime time,
  String? taskTitle,
  String? categoryValue,
  DelayType? delayType,
  CancelType? cancelType,
}) {
  return TaskTransitionEvent(
    taskId: taskId,
    event: event,
    delta: delta,
    time: time,
    eventId: eventId,
    taskTitle: taskTitle,
    categoryValue: categoryValue,
    delayType: delayType,
    cancelType: cancelType,
  );
}

void main() {
  group('TrendEngine', () {
    test('3 个同类 completed → score=-3, direction=improve', () async {
      final Repositories repos = Repositories.inMemory();
      final TrendEngine engine =
          TrendEngine(trendRepo: repos.trends, themeRepo: repos.themes);
      final DateTime now = DateTime.now();

      for (int i = 0; i < 3; i++) {
        await engine.handleTaskEvent(_event(
          eventId: 'ev-completed-$i',
          taskId: 'task-1',
          event: 'completed',
          delta: -1,
          time: now.subtract(Duration(days: i)),
          taskTitle: '背单词',
          categoryValue: '学习',
        ));
      }

      final List<Trend> trends = await repos.trends.listAll();
      final Trend trend = trends.firstWhere((t) => t.trendName == '背单词');

      expect(trend.score, -3);
      expect(trend.direction, ThemeDirection.improving);
    });

    test(
        '1 avoidance delayed(+2) + 1 completed(-1) → score=+1, direction=worsen',
        () async {
      final Repositories repos = Repositories.inMemory();
      final TrendEngine engine =
          TrendEngine(trendRepo: repos.trends, themeRepo: repos.themes);
      final DateTime now = DateTime.now();

      await engine.handleTaskEvent(_event(
        eventId: 'ev-delayed-1',
        taskId: 'task-2',
        event: 'delayed',
        delta: 0,
        time: now,
        taskTitle: '跑步',
        categoryValue: '健康',
        delayType: DelayType.avoidance,
      ));

      await engine.handleTaskEvent(_event(
        eventId: 'ev-completed-1',
        taskId: 'task-2',
        event: 'completed',
        delta: -1,
        time: now,
        taskTitle: '跑步',
        categoryValue: '健康',
      ));

      final List<Trend> trends = await repos.trends.listAll();
      final Trend trend = trends.firstWhere((t) => t.trendName == '跑步');

      expect(trend.score, 1);
      expect(trend.direction, ThemeDirection.worsening);
    });

    test('60 条事件 → evidence.length<=50, score == 60条 delta 累加', () async {
      final Repositories repos = Repositories.inMemory();
      final TrendEngine engine =
          TrendEngine(trendRepo: repos.trends, themeRepo: repos.themes);
      final DateTime now = DateTime.now();

      double expectedScore = 0;
      for (int i = 0; i < 60; i++) {
        const double delta = -1;
        expectedScore += delta;
        await engine.handleTaskEvent(_event(
          eventId: 'ev-bulk-$i',
          taskId: 'task-3',
          event: 'completed',
          delta: delta,
          time: now.subtract(Duration(hours: i)),
          taskTitle: '写周报',
          categoryValue: '项目',
        ));
      }

      final List<Trend> trends = await repos.trends.listAll();
      final Trend trend = trends.firstWhere((t) => t.trendName == '写周报');

      expect(trend.evidence.length, lessThanOrEqualTo(50));
      expect(trend.score, expectedScore);
    });

    test('幂等：同 eventId 发两次 → score 只加一次', () async {
      final Repositories repos = Repositories.inMemory();
      final TrendEngine engine =
          TrendEngine(trendRepo: repos.trends, themeRepo: repos.themes);
      final DateTime now = DateTime.now();

      final TaskTransitionEvent ev = _event(
        eventId: 'ev-dup-1',
        taskId: 'task-4',
        event: 'completed',
        delta: -1,
        time: now,
        taskTitle: '冥想',
        categoryValue: '情绪',
      );

      await engine.handleTaskEvent(ev);
      await engine.handleTaskEvent(ev); // 重复发送，eventId 相同

      final List<Trend> trends = await repos.trends.listAll();
      final Trend trend = trends.firstWhere((t) => t.trendName == '冥想');

      expect(trend.score, -1);
      expect(trend.evidence.length, 1);
    });

    test('theme 聚合：两个不同 taskTitle 同 category → theme 聚合两者', () async {
      final Repositories repos = Repositories.inMemory();
      final TrendEngine engine =
          TrendEngine(trendRepo: repos.trends, themeRepo: repos.themes);
      final DateTime now = DateTime.now();

      await engine.handleTaskEvent(_event(
        eventId: 'ev-a-1',
        taskId: 'task-5',
        event: 'completed',
        delta: -1,
        time: now,
        taskTitle: '背单词',
        categoryValue: '学习',
      ));

      await engine.handleTaskEvent(_event(
        eventId: 'ev-b-1',
        taskId: 'task-6',
        event: 'completed',
        delta: -1,
        time: now,
        taskTitle: '读书',
        categoryValue: '学习',
      ));

      final List<ThemeItem> themes = await repos.themes.listAll();
      final ThemeItem theme = themes.firstWhere((t) => t.themeName == '学习');

      expect(theme.trendNames, containsAll(<String>['背单词', '读书']));
      expect(theme.weight, greaterThan(0));
    });
  });
}
