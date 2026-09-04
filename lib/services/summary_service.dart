import 'package:uuid/uuid.dart';

import 'package:ai_life_recorder/ai/summary_ai.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/summary.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';

class SummaryService {
  SummaryService({
    required this.repos,
    required this.summaryAi,
    required this.nowMillis,
  });

  final Repositories repos;
  final SummaryAi summaryAi;
  final int Function() nowMillis;

  Future<Summary> generateWeekly() {
    return _generate(SummaryType.weekly);
  }

  Future<Summary> generateMonthly() {
    return _generate(SummaryType.monthly);
  }

  Future<Summary> _generate(SummaryType type) async {
    final now = DateTime.fromMillisecondsSinceEpoch(nowMillis());

    // 周期边界按本地时间计算。
    // 数据落库时统一转 UTC，符合项目存储规范。
    final periodEndLocal = now;
    final periodStartLocal = periodEndLocal.subtract(
      Duration(
        days: type == SummaryType.weekly ? 7 : 30,
      ),
    );

    final periodStartUtc = periodStartLocal.toUtc();
    final periodEndUtc = periodEndLocal.toUtc();

    final memories = await repos.memories.list(
      from: periodStartLocal,
      to: periodEndLocal,
    );

    final usableMemories = memories
        .where(
          (memory) =>
              memory.aiSummary != null && memory.aiSummary!.trim().isNotEmpty,
        )
        .toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    final memoryCount = memories.length;
    final memorySummaries = usableMemories
        .take(30)
        .map((memory) => memory.aiSummary!.trim())
        .toList();

    final photos = await repos.photos.listByRange(
      periodStartLocal,
      periodEndLocal,
    );

    final usablePhotos = photos
        .where(
          (photo) =>
              photo.summaryConfirmed &&
              photo.aiSummary != null &&
              photo.aiSummary!.trim().isNotEmpty,
        )
        .toList();

    final photoSummaries =
        usablePhotos.map((photo) => photo.aiSummary!.trim()).toList();

    final tasks = await repos.tasks.listByStatus(null);
    final taskStats = _buildTaskStats(
      tasks: tasks,
      periodStartLocal: periodStartLocal,
      periodEndLocal: periodEndLocal,
    );

    final taskByCategory = _buildTaskCategoryCounts(tasks);

    final aggregate = <String, dynamic>{
      'type': type.value,
      'periodStart': periodStartUtc.toIso8601String(),
      'periodEnd': periodEndUtc.toIso8601String(),
      'memoryCount': memoryCount,
      'memories': memorySummaries,
      'photoCount': usablePhotos.length,
      'photos': photoSummaries,
      'taskStats': taskStats,
      'taskByCategory': taskByCategory,
    };

    final aiResult = await summaryAi.generate(
      type: type,
      aggregate: aggregate,
    );

    // 同周期已有总结则复用其 id：upsert 覆盖而非新增，避免历史重复
    final existing =
        await repos.summaries.getByPeriod(type, periodStartUtc);

    final summary = Summary(
      id: existing?.id ?? const Uuid().v4(),
      type: type,
      periodStart: periodStartUtc,
      periodEnd: periodEndUtc,
      content: aiResult['content'] as String? ?? '',
      themes: _readStringList(aiResult['themes']),
      highlights: _readStringList(aiResult['highlights']),
      taskSuggestions: _readStringList(aiResult['taskSuggestions']),
      trends: <String, dynamic>{
        'taskByCategory': taskByCategory,
      },
      chartData: <String, dynamic>{
        'memoryByDay': _buildMemoryByDay(
          memories: memories,
          periodStartLocal: periodStartLocal,
          periodEndLocal: periodEndLocal,
        ),
        'photoByDay': _buildPhotoByDay(
          photos: photos,
          periodStartLocal: periodStartLocal,
          periodEndLocal: periodEndLocal,
        ),
      },
      createdAt: DateTime.fromMillisecondsSinceEpoch(nowMillis()).toUtc(),
    );

    await repos.summaries.upsert(summary);

    return summary;
  }

  Map<String, dynamic> _buildTaskStats({
    required List<Task> tasks,
    required DateTime periodStartLocal,
    required DateTime periodEndLocal,
  }) {
    var doneCount = 0;
    var delayedCount = 0;
    var cancelledCount = 0;

    for (final task in tasks) {
      final completedTime = task.feedback.completedTime;

      if (completedTime != null &&
          _isWithinPeriod(
            completedTime,
            periodStartLocal,
            periodEndLocal,
          )) {
        doneCount++;
      }

      // 当前已提供的 Task API 没有“延期变更时间”字段。
      // 因此按要求采用当前状态为 delayed 的任务作为延期统计口径。
      if (task.status == TaskStatus.delayed) {
        delayedCount++;
      }

      if (task.status == TaskStatus.cancelled) {
        cancelledCount++;
      }
    }

    return <String, dynamic>{
      'done': doneCount,
      'delayed': delayedCount,
      'cancelled': cancelledCount,
      'total': tasks.length,
      'delayedNote': '延期数按当前状态为延期的任务统计。',
    };
  }

  Map<String, int> _buildTaskCategoryCounts(List<Task> tasks) {
    final result = <String, int>{};

    for (final category in TaskCategory.values) {
      result[category.value] = 0;
    }

    for (final task in tasks) {
      final key = task.category.value;
      result[key] = (result[key] ?? 0) + 1;
    }

    return result;
  }

  Map<String, int> _buildMemoryByDay({
    required List<Memory> memories,
    required DateTime periodStartLocal,
    required DateTime periodEndLocal,
  }) {
    final result = <String, int>{};

    for (final memory in memories) {
      if (!_isWithinPeriod(
        memory.createdAt,
        periodStartLocal,
        periodEndLocal,
      )) {
        continue;
      }

      final key = _dayKey(memory.createdAt);
      result[key] = (result[key] ?? 0) + 1;
    }

    return result;
  }

  Map<String, int> _buildPhotoByDay({
    required List<Photo> photos,
    required DateTime periodStartLocal,
    required DateTime periodEndLocal,
  }) {
    final result = <String, int>{};

    for (final photo in photos) {
      if (!_isWithinPeriod(
        photo.takenAt,
        periodStartLocal,
        periodEndLocal,
      )) {
        continue;
      }

      final key = _dayKey(photo.takenAt);
      result[key] = (result[key] ?? 0) + 1;
    }

    return result;
  }

  bool _isWithinPeriod(
    DateTime value,
    DateTime start,
    DateTime end,
  ) {
    final localValue = value.toLocal();
    final localStart = start.toLocal();
    final localEnd = end.toLocal();

    return !localValue.isBefore(localStart) && !localValue.isAfter(localEnd);
  }

  String _dayKey(DateTime value) {
    final local = value.toLocal();

    String twoDigits(int value) {
      return value.toString().padLeft(2, '0');
    }

    return '${local.year}-${twoDigits(local.month)}-${twoDigits(local.day)}';
  }

  List<String> _readStringList(dynamic value) {
    if (value is! List) {
      return <String>[];
    }

    return value.whereType<String>().toList();
  }
}
