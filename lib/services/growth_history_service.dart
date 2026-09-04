// lib/services/growth_history_service.dart
//
// 成长历史服务：从打卡记录仓库读取真实记录 → 按周统计完成率 → 多类型合并 →
// 得到可直接注入 GrowthCurveScreen 的 GrowthUpdateResult 序列。
// 包含轻量静态内存缓存与时区边界修正（上限用本地当天 23:59:59.999，避免 UTC 混用漏查）。
import 'package:ai_life_recorder/growth/growth_engine.dart';
import 'package:ai_life_recorder/growth/multi_type_growth_combiner.dart';
import 'package:ai_life_recorder/growth/weekly_completion_builder.dart';
import 'package:ai_life_recorder/repositories/check_in_record_repository.dart';

class GrowthHistoryService {
  final CheckInRecordRepository recordRepository;
  final MultiTypeGrowthCombiner combiner;

  // 静态轻量缓存：同一仓库数据量小，记录数不变即复用上次计算结果，避免每次全量重算
  static List<GrowthUpdateResult>? _cachedSeries;
  static DateTime? _lastComputeTime;
  static int? _cachedRecordCount;

  GrowthHistoryService({
    required this.recordRepository,
    MultiTypeGrowthCombiner? combiner,
  }) : combiner = combiner ?? const MultiTypeGrowthCombiner();

  /// 清空静态缓存（测试或强制刷新用）。
  static void clearCache() {
    _cachedSeries = null;
    _lastComputeTime = null;
    _cachedRecordCount = null;
  }

  /// 最近一次计算时间。
  static DateTime? get lastComputeTime => _lastComputeTime;

  /// 读取打卡记录生成成长序列。[forceRefresh]=true 忽略缓存强制重算。
  Future<List<GrowthUpdateResult>> loadGrowthSeries({
    bool forceRefresh = false,
  }) async {
    final now = DateTime.now();
    // 边界统一：上限取本地当天 23:59:59.999（CheckInRecord.date 为本地日历日）
    final endOfToday = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
    final records = await recordRepository.listByRange(
      DateTime(2000, 1, 1),
      endOfToday,
    );

    if (records.isEmpty) {
      _cachedSeries = const <GrowthUpdateResult>[];
      _lastComputeTime = DateTime.now();
      _cachedRecordCount = 0;
      return const <GrowthUpdateResult>[];
    }

    // 缓存命中：非强制、有缓存、记录条数一致
    if (!forceRefresh &&
        _cachedSeries != null &&
        _cachedRecordCount == records.length) {
      return _cachedSeries!;
    }

    final entries = records.map((r) {
      return CheckInDayEntry(typeId: r.typeId, date: r.date);
    }).toList();

    final snapshots = buildWeeklySnapshots(entries);
    final points = combiner.combine(snapshots);
    final results = points.map((p) => p.update).toList();

    _cachedSeries = results;
    _lastComputeTime = DateTime.now();
    _cachedRecordCount = records.length;
    return results;
  }
}
