import 'package:uuid/uuid.dart';

import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/theme.dart';
import 'package:ai_life_recorder/models/trend.dart';
import 'package:ai_life_recorder/repositories/theme_repository.dart';
import 'package:ai_life_recorder/repositories/trend_repository.dart';
import 'package:ai_life_recorder/services/task_service.dart';

/// 趋势与主题引擎。
///
/// 设计要点（已过两轮评审）：
/// - Trend 模型不新增窗口字段，score 全量持久化累加，
///   recent30/recent90 窗口值每次从 evidence 现算，不持久化，
///   避免"只增不减"导致的方向长期漂移。
/// - evidence 上限固定为最近 50 条：活跃度很高的趋势可能覆盖不满
///   90 天窗口，此时 recent90Count/weight 会偏保守（低估），
///   这是可接受的近似（不会像"只增不减"方案那样单向永久漂移）。
/// - trend key 优先使用具体任务标题（taskTitle），
///   仅当标题缺失时才退化为 category，这样 Theme 层的加权聚合
///   才有实际意义（同一 category 下可以有多个具体趋势）。
/// - 通过 eventId 做幂等判重，避免重复事件重复计分。
/// - handleTaskEvent 对外暴露的调用通过内部 _tail Future 链
///   严格串行执行，防止并发调用互相踩踏（读-改-写丢失更新）。
class TrendEngine {
  TrendEngine(
      {required TrendRepository trendRepo, required ThemeRepository themeRepo})
      : _trendRepo = trendRepo,
        _themeRepo = themeRepo;

  final TrendRepository _trendRepo;
  final ThemeRepository _themeRepo;

  final Uuid _uuid = const Uuid();

  Future<void> _tail = Future<void>.value();

  static const Duration _window30 = Duration(days: 30);
  static const Duration _window90 = Duration(days: 90);
  static const int _evidenceLimit = 50;

  /// 对外唯一入口。内部保证严格串行执行，调用方不需要（也不应该）
  /// 用 unawaited 包裹。
  Future<void> handleTaskEvent(TaskTransitionEvent ev) {
    final Future<void> result = _tail.then((_) => _handle(ev));
    // 防止一次失败阻塞后续队列；错误已在 _handle 内部产生，这里只是
    // 保证队列本身不会因为一次异常而永久卡住。
    _tail = result.catchError((_) {});
    return result;
  }

  Future<void> _handle(TaskTransitionEvent ev) async {
    final double delta = _computeDelta(ev);

    final String category = ev.categoryValue ?? '未分类';
    final String trendName =
        (ev.taskTitle != null && ev.taskTitle!.trim().isNotEmpty)
            ? ev.taskTitle!.trim()
            : category;

    final List<Trend> allTrends = await _trendRepo.listAll();
    Trend trend = allTrends.firstWhere(
      (t) => t.trendName == trendName,
      orElse: () => Trend(
        id: _uuid.v4(),
        trendName: trendName,
        category: category,
        score: 0,
        direction: ThemeDirection.stable,
        weight: 0,
        evidence: <Map<String, dynamic>>[],
        cluster: category,
        updatedAt: DateTime.now(),
      ),
    );

    // 幂等：同一 eventId 已经记录过，直接跳过，不再重复计分。
    final bool alreadyRecorded =
        trend.evidence.any((e) => e['eventId'] == ev.eventId);
    if (alreadyRecorded) {
      return;
    }

    final DateTime now = DateTime.now();

    final List<Map<String, dynamic>> newEvidence =
        List<Map<String, dynamic>>.from(trend.evidence);
    newEvidence.insert(0, <String, dynamic>{
      'eventId': ev.eventId,
      'taskId': ev.taskId,
      'event': ev.event,
      'delta': delta,
      'time': ev.time.toUtc().toIso8601String(),
      'category': category,
      'behaviorImprovement': ev.behaviorImprovement,
    });
    if (newEvidence.length > _evidenceLimit) {
      newEvidence.removeLast();
    }

    final double newScore = trend.score + delta;
    final double recent30Sum = _sumRecentDelta(newEvidence, now, _window30);
    final int recent90Count = _countRecent(newEvidence, now, _window90);
    final double newWeight = recent90Count * newScore.abs();
    final ThemeDirection newDirection = recent30Sum < 0
        ? ThemeDirection.improving
        : recent30Sum > 0
            ? ThemeDirection.worsening
            : ThemeDirection.stable;

    final Trend updatedTrend = trend.copyWith(
      score: newScore,
      direction: newDirection,
      weight: newWeight,
      evidence: newEvidence,
      updatedAt: now,
    );

    await _trendRepo.upsertByName(updatedTrend);
    await _recomputeTheme(category);
  }

  Future<void> _recomputeTheme(String category) async {
    final List<Trend> allTrends = await _trendRepo.listAll();
    final List<Trend> trendsInCategory =
        allTrends.where((t) => t.category == category).toList();

    final DateTime now = DateTime.now();

    double totalWeight = 0;
    double weightedScoreSum = 0;
    final List<Map<String, dynamic>> mergedEvidence = <Map<String, dynamic>>[];
    final List<String> trendNames = <String>[];

    for (final Trend t in trendsInCategory) {
      totalWeight += t.weight;
      final double recent30Sum = _sumRecentDelta(t.evidence, now, _window30);
      weightedScoreSum += recent30Sum * t.weight;
      mergedEvidence.addAll(t.evidence);
      trendNames.add(t.trendName);
    }

    final double themeScore =
        totalWeight == 0 ? 0 : weightedScoreSum / totalWeight;
    final ThemeDirection direction = themeScore < 0
        ? ThemeDirection.improving
        : themeScore > 0
            ? ThemeDirection.worsening
            : ThemeDirection.stable;

    mergedEvidence.sort((a, b) {
      final DateTime ta = DateTime.parse(a['time'] as String);
      final DateTime tb = DateTime.parse(b['time'] as String);
      return tb.compareTo(ta); // 降序
    });
    final List<Map<String, dynamic>> limitedEvidence =
        mergedEvidence.length > _evidenceLimit
            ? mergedEvidence.sublist(0, _evidenceLimit)
            : mergedEvidence;

    final List<ThemeItem> allThemes = await _themeRepo.listAll();
    final ThemeItem existing = allThemes.firstWhere(
      (th) => th.themeName == category,
      orElse: () => ThemeItem(
        id: _uuid.v4(),
        themeName: category,
        weight: 0,
        direction: ThemeDirection.stable,
        evidence: <Map<String, dynamic>>[],
        clusterNames: <String>[category],
        trendNames: <String>[],
        updatedAt: now,
      ),
    );

    final ThemeItem updatedTheme = existing.copyWith(
      weight: totalWeight,
      direction: direction,
      evidence: limitedEvidence,
      trendNames: trendNames,
      updatedAt: now,
    );

    await _themeRepo.upsertByName(updatedTheme);
  }

  double _computeDelta(TaskTransitionEvent ev) {
    if (ev.event == 'completed') {
      return -1;
    }
    if (ev.event == 'delayed') {
      if (ev.delayType == DelayType.external) return 0.5;
      if (ev.delayType == DelayType.internal) return 1.0;
      if (ev.delayType == DelayType.avoidance) return 2.0;
      return 0;
    }
    if (ev.event == 'cancelled') {
      if (ev.cancelType == CancelType.active) return 0.0;
      if (ev.cancelType == CancelType.passive) return 1.0;
      if (ev.cancelType == CancelType.avoidance) return 2.0;
      return 0;
    }
    // 未知事件类型兜底：使用事件自带的 delta，避免静默丢分。
    return ev.delta;
  }

  double _sumRecentDelta(
      List<Map<String, dynamic>> evidence, DateTime now, Duration window) {
    final DateTime cutoff = now.subtract(window);
    double sum = 0;
    for (final Map<String, dynamic> e in evidence) {
      final DateTime t = DateTime.parse(e['time'] as String);
      if (!t.isBefore(cutoff)) {
        final num d = e['delta'] as num;
        sum += d.toDouble();
      }
    }
    return sum;
  }

  int _countRecent(
      List<Map<String, dynamic>> evidence, DateTime now, Duration window) {
    final DateTime cutoff = now.subtract(window);
    int count = 0;
    for (final Map<String, dynamic> e in evidence) {
      final DateTime t = DateTime.parse(e['time'] as String);
      if (!t.isBefore(cutoff)) {
        count++;
      }
    }
    return count;
  }
}
