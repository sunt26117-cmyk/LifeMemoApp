// lib/screens/checkin/check_in_calendar_screen.dart
// TASK-EXT-03：日历打卡交互与日期权限（马卡龙柔和生活风格 + 农历/中国节日支持）。
// 规则：今天可编辑；过去只读；未来不可打卡。
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/models/check_in_record.dart';
import 'package:ai_life_recorder/models/check_in_type.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
import 'package:ai_life_recorder/utils/chinese_calendar_util.dart';
import 'widgets/today_checkin_panel.dart';

class CheckInCalendarScreen extends StatefulWidget {
  const CheckInCalendarScreen({super.key});

  @override
  State<CheckInCalendarScreen> createState() => _CheckInCalendarScreenState();
}

class _CheckInCalendarScreenState extends State<CheckInCalendarScreen> {
  DateTime _visibleMonth = DateTime.now();
  bool _loading = true;
  List<CheckInType> _enabledTypes = [];
  final Map<String, List<CheckInRecord>> _recordsCache = {};

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final types = await context.read<Repositories>().checkInTypes.listEnabled();
    if (!mounted) return;
    setState(() {
      _enabledTypes = types;
      _loading = false;
    });
    await _refreshRecords();
  }

  Future<void> _refreshRecords() async {
    final repos = context.read<Repositories>();
    final range = _monthRange(_visibleMonth);
    final records =
        await repos.checkInRecords.listByRange(range.start, range.end);
    final map = <String, List<CheckInRecord>>{};
    for (final r in records) {
      final key = CheckInRecord.dateKey(r.date);
      map.putIfAbsent(key, () => []).add(r);
    }
    if (!mounted) return;
    setState(() {
      _recordsCache
        ..clear()
        ..addAll(map);
    });
  }

  ({DateTime start, DateTime end}) _monthRange(DateTime month) {
    final start = DateTime(month.year, month.month, 1);
    final end = DateTime(month.year, month.month + 1, 0);
    return (start: start, end: end);
  }

  List<DateTime> _daysForMonth(DateTime month) {
    final first = DateTime(month.year, month.month, 1);
    final last = DateTime(month.year, month.month + 1, 0);
    final startWeekday = first.weekday % 7; // 周日=0
    final totalDays = last.day;
    final days = <DateTime>[];
    for (int i = 0; i < startWeekday; i++) {
      days.add(first.subtract(Duration(days: startWeekday - i)));
    }
    for (int d = 1; d <= totalDays; d++) {
      days.add(DateTime(month.year, month.month, d));
    }
    while (days.length % 7 != 0) {
      days.add(days.last.add(const Duration(days: 1)));
    }
    return days;
  }

  DateTime _today() {
    final n = DateTime.now();
    return DateTime(n.year, n.month, n.day);
  }

  bool _isSameDate(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  Future<void> _onDayTap(DateTime day) async {
    final today = _today();
    if (day.isAfter(today)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('未来日期不可打卡')),
      );
      return;
    }
    final key = CheckInRecord.dateKey(day);
    final existing = _recordsCache[key] ?? [];
    if (_isSameDate(day, today)) {
      final selectedIds = existing.map((r) => r.typeId).toList();
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (ctx) => TodayCheckInPanel(
          types: _enabledTypes,
          initialSelectedTypeIds: selectedIds,
          onSubmit: (ids) async {
            await _submitToday(day, ids);
          },
        ),
      );
    } else {
      _showPastDialog(day, existing);
    }
  }

  Future<void> _submitToday(DateTime day, List<String> selectedIds) async {
    final repos = context.read<Repositories>();
    final existing = await repos.checkInRecords.listByDate(day);
    for (final e in existing) {
      await repos.checkInRecords.deleteByDateAndType(day, e.typeId);
    }
    final types = await repos.checkInTypes.listEnabled();
    final typeMap = {for (final t in types) t.id: t};
    for (final typeId in selectedIds) {
      final type = typeMap[typeId];
      if (type == null) continue;
      final record = CheckInRecord.create(
        id: const Uuid().v4(),
        date: day,
        typeId: typeId,
        symbol: type.symbol,
        label: type.label,
      );
      await repos.checkInRecords.upsert(record);
    }
    if (!mounted) return;
    await _refreshRecords();
  }

  void _showPastDialog(DateTime day, List<CheckInRecord> records) {
    final dayInfo = ChineseCalendarUtil.getDayInfo(day);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(DateFormat.yMMMMd('zh_CN').format(day)),
            const SizedBox(height: 4),
            Text(
              '农历${dayInfo.lunarMonth}月${dayInfo.lunarDay}'
              '${dayInfo.primaryFestival == null ? '' : ' · ${dayInfo.primaryFestival}'}',
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.neutral,
                fontWeight: FontWeight.normal,
              ),
            ),
          ],
        ),
        content: records.isEmpty
            ? const Text('该日无打卡记录')
            : Wrap(
                spacing: 8,
                runSpacing: 8,
                children: records
                    .map((r) => Chip(
                          backgroundColor: AppColors.primary.withOpacity(0.08),
                          avatar: Text(r.symbolSnapshot),
                          label: Text(r.labelSnapshot),
                        ))
                    .toList(),
              ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('关闭'),
          ),
        ],
      ),
    );
  }

  Future<void> _changeMonth(int delta) async {
    setState(() {
      _visibleMonth = DateTime(_visibleMonth.year, _visibleMonth.month + delta);
    });
    await _refreshRecords();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: AppColors.pageBackgroundGradient,
        ),
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('日历打卡',
              style: TextStyle(
                  fontWeight: FontWeight.w600, color: Color(0xFF2D3748))),
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          actions: [
            IconButton(
              icon: const Icon(Icons.chevron_left, color: Color(0xFF5A6A80)),
              onPressed: () => _changeMonth(-1),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right, color: Color(0xFF5A6A80)),
              onPressed: () => _changeMonth(1),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  _buildMonthHeader(),
                  _buildWeekdayHeader(),
                  Expanded(
                    child: GridView.builder(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 7,
                        childAspectRatio: 0.88,
                        mainAxisSpacing: 4,
                        crossAxisSpacing: 4,
                      ),
                      itemCount: _daysForMonth(_visibleMonth).length,
                      itemBuilder: (context, idx) {
                        final day = _daysForMonth(_visibleMonth)[idx];
                        return _buildDayCell(day);
                      },
                    ),
                  ),
                  _buildLegend(),
                ],
              ),
      ),
    );
  }

  Widget _buildMonthHeader() {
    final lunarMonthText =
        ChineseCalendarUtil.getLunarMonthString(_visibleMonth);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            DateFormat.yMMMM('zh_CN').format(_visibleMonth),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF2D3748),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
            decoration: BoxDecoration(
              color: AppColors.lavender.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              lunarMonthText,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF6E5698),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWeekdayHeader() {
    const names = ['日', '一', '二', '三', '四', '五', '六'];
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.65),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: List.generate(7, (i) {
          final isWeekend = i == 0 || i == 6;
          return Expanded(
            child: Center(
              child: Text(
                names[i],
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  color: isWeekend
                      ? AppColors.creamOrange
                      : const Color(0xFF5A6A80),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildDayCell(DateTime day) {
    final today = _today();
    final isCurrentMonth = day.month == _visibleMonth.month;
    final isToday = _isSameDate(day, today);
    final isFuture = day.isAfter(today);
    final key = CheckInRecord.dateKey(day);
    final records = _recordsCache[key] ?? [];
    final symbols = records
        .map((r) => r.symbolSnapshot)
        .where((s) => s.isNotEmpty)
        .toList();
    final hasRecords = symbols.isNotEmpty;
    final dayInfo = ChineseCalendarUtil.getDayInfo(day);

    Color bgColor = Colors.transparent;
    Border? border;
    List<BoxShadow>? shadows;

    if (isToday) {
      bgColor = AppColors.primary.withOpacity(0.12);
      border = Border.all(color: AppColors.primary, width: 1.5);
    } else if (hasRecords && isCurrentMonth) {
      bgColor = Colors.white;
      border = Border.all(color: AppColors.mint.withOpacity(0.45), width: 1.0);
      shadows = [
        BoxShadow(
          color: AppColors.mint.withOpacity(0.12),
          blurRadius: 4,
          offset: const Offset(0, 1.5),
        ),
      ];
    } else if (dayInfo.isFestival && isCurrentMonth) {
      bgColor = AppColors.softPink.withOpacity(0.08);
      border =
          Border.all(color: AppColors.softPink.withOpacity(0.35), width: 0.8);
    } else if (isCurrentMonth) {
      bgColor = Colors.white.withOpacity(0.55);
      border = Border.all(color: Colors.black.withOpacity(0.04), width: 0.5);
    }

    Color solarColor;
    if (!isCurrentMonth) {
      solarColor = Colors.grey.shade400;
    } else if (isToday) {
      solarColor = AppColors.primary;
    } else if (isFuture) {
      solarColor = Colors.grey.shade400;
    } else {
      solarColor = const Color(0xFF2D3748);
    }

    Color lunarColor;
    FontWeight lunarFontWeight = FontWeight.normal;
    if (!isCurrentMonth) {
      lunarColor = Colors.grey.shade300;
    } else if (dayInfo.isFestival) {
      lunarColor = AppColors.creamOrange;
      lunarFontWeight = FontWeight.w600;
    } else if (isFuture) {
      lunarColor = Colors.grey.shade400;
    } else {
      lunarColor = AppColors.neutral;
    }

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _onDayTap(day),
      child: Container(
        margin: const EdgeInsets.all(2),
        padding: const EdgeInsets.fromLTRB(2, 4, 2, 3),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          border: border,
          boxShadow: shadows,
        ),
        child: Stack(
          children: [
            if (dayInfo.isFestival && isCurrentMonth)
              Positioned(
                top: 0,
                right: 2,
                child: Container(
                  width: 5,
                  height: 5,
                  decoration: const BoxDecoration(
                    color: AppColors.softPink,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            Column(
              children: [
                Text(
                  day.day.toString(),
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: isToday ? FontWeight.bold : FontWeight.w600,
                    color: solarColor,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  dayInfo.displayLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: lunarFontWeight,
                    color: lunarColor,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 2),
                Expanded(
                  child: symbols.isEmpty
                      ? const SizedBox()
                      : Center(
                          child: Wrap(
                            spacing: 1.5,
                            runSpacing: 1.5,
                            alignment: WrapAlignment.center,
                            children: symbols
                                .take(4)
                                .map((s) => Text(
                                      s,
                                      style: const TextStyle(
                                        fontSize: 10.5,
                                        height: 1.0,
                                      ),
                                    ))
                                .toList(),
                          ),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegend() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildLegendItem('今天', AppColors.primary),
          const SizedBox(width: 16),
          _buildLegendItem('节日/节气', AppColors.softPink),
          const SizedBox(width: 16),
          _buildLegendItem('已打卡', AppColors.mint),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Color(0xFF7A889B)),
        ),
      ],
    );
  }
}
