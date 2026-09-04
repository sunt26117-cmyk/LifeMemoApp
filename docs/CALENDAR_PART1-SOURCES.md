# 打卡日历美化 + 农历/中国节日 派单 · 文件 1/2：现有源码 + lunar API 事实

> 请基于以下真实源码修改。lunar 包已添加（pubspec ^1.7.8），禁止臆造其 API——文末给了已核实的真实方法签名。

```dart
// ===== FILE: lib/screens/checkin/check_in_calendar_screen.dart =====
// lib/screens/checkin/check_in_calendar_screen.dart
// TASK-EXT-03：日历打卡交互与日期权限。
// 规则：今天可编辑；过去只读；未来不可打卡。
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import 'package:ai_life_recorder/models/check_in_record.dart';
import 'package:ai_life_recorder/models/check_in_type.dart';
import 'package:ai_life_recorder/repositories/repositories.dart';
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
    final records = await repos.checkInRecords.listByRange(range.start, range.end);
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
      // 今天：弹出底部多选面板，覆盖式提交
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
      // 过去：只读展示
      _showPastDialog(day, existing);
    }
  }

  Future<void> _submitToday(DateTime day, List<String> selectedIds) async {
    final repos = context.read<Repositories>();
    // 覆盖式提交：先删除当天全部记录，再插入选中集合
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
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(DateFormat.yMMMMd('zh_CN').format(day)),
        content: records.isEmpty
            ? const Text('该日无打卡记录')
            : Wrap(
                spacing: 8,
                children: records
                    .map((r) => Chip(
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
      _visibleMonth =
          DateTime(_visibleMonth.year, _visibleMonth.month + delta);
    });
    await _refreshRecords();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('日历打卡'),
        actions: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () => _changeMonth(-1),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () => _changeMonth(1),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    DateFormat.yMMMM('zh_CN').format(_visibleMonth),
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                ),
                _buildWeekdayHeader(),
                Expanded(
                  child: GridView.builder(
                    padding: const EdgeInsets.all(8),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 7,
                      childAspectRatio: 1,
                    ),
                    itemCount: _daysForMonth(_visibleMonth).length,
                    itemBuilder: (context, idx) {
                      final day = _daysForMonth(_visibleMonth)[idx];
                      return _buildDayCell(day);
                    },
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildWeekdayHeader() {
    const names = ['日', '一', '二', '三', '四', '五', '六'];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: names
            .map((n) => Expanded(
                  child: Center(
                    child: Text(n,
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ))
            .toList(),
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
    final symbols = records.map((r) => r.symbolSnapshot).where((s) => s.isNotEmpty).toList();

    return GestureDetector(
      onTap: isFuture ? null : () => _onDayTap(day),
      child: Container(
        margin: const EdgeInsets.all(4),
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: isToday
              ? Theme.of(context).colorScheme.primary.withOpacity(0.08)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: isToday
              ? Border.all(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.3))
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              day.day.toString(),
              style: TextStyle(
                color: isCurrentMonth
                    ? (isFuture ? Colors.grey : Colors.black)
                    : Colors.grey.shade400,
                fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            const SizedBox(height: 4),
            Expanded(
              child: Wrap(
                spacing: 2,
                runSpacing: 2,
                children: symbols
                    .take(4)
                    .map((s) => Text(s, style: const TextStyle(fontSize: 12)))
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

```

```dart
// ===== FILE: lib/screens/checkin/widgets/today_checkin_panel.dart =====
// lib/screens/checkin/widgets/today_checkin_panel.dart
import 'package:flutter/material.dart';
import 'package:ai_life_recorder/models/check_in_type.dart';

/// 今天打卡底部多选面板（TASK-EXT-03）。
/// 只显示 symbol（emoji），多个类型 chip 可多选；提交为覆盖式集合。
class TodayCheckInPanel extends StatefulWidget {
  final List<CheckInType> types;
  final List<String> initialSelectedTypeIds;
  final ValueChanged<List<String>> onSubmit;
  const TodayCheckInPanel({
    super.key,
    required this.types,
    required this.initialSelectedTypeIds,
    required this.onSubmit,
  });

  @override
  State<TodayCheckInPanel> createState() => _TodayCheckInPanelState();
}

class _TodayCheckInPanelState extends State<TodayCheckInPanel> {
  late final Set<String> _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.initialSelectedTypeIds.toSet();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              '选择打卡类型',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 12,
              runSpacing: 12,
              children: widget.types.map((t) {
                final selected = _selected.contains(t.id);
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      if (selected) {
                        _selected.remove(t.id);
                      } else {
                        _selected.add(t.id);
                      }
                    });
                  },
                  child: Container(
                    width: 56,
                    height: 56,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: selected
                          ? Theme.of(context).colorScheme.primary
                          : Colors.grey.shade100,
                      border: Border.all(
                        color: selected
                            ? Theme.of(context).colorScheme.primary
                            : Colors.transparent,
                      ),
                    ),
                    child: Text(
                      t.symbol,
                      style: const TextStyle(fontSize: 24),
                    ),
                  ),
                );
              }).toList(),
            ),
            if (widget.types.isEmpty) ...[
              const SizedBox(height: 12),
              const Center(
                child: Text(
                  '暂无启用的打卡类型，请先到「打卡类型管理」添加',
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                ),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              height: 48,
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('取消'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        widget.onSubmit(_selected.toList());
                        Navigator.of(context).pop();
                      },
                      child: const Text('保存'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

```

```dart
// ===== FILE: lib/constants/app_colors.dart =====
// lib/constants/app_colors.dart
//
// 应用色彩体系。
import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ================= 原有字段（保留字段名，兼容现有引用） =================

  /// 主色：清爽天蓝 / 湖蓝
  static const Color primary = Color(0xFF57B8E3);

  /// 全局背景：柔和奶白（带一点暖调）
  static const Color background = Color(0xFFFFF8F2);

  /// 次要文字 / 中性色：柔和灰蓝
  static const Color neutral = Color(0xFF98A3B3);

  /// 卡片底色
  static const Color card = Colors.white;

  /// 成功色：薄荷绿系
  static const Color success = Color(0xFF4FBF95);

  /// 警示色：奶油橙系
  static const Color warning = Color(0xFFFF9A5A);

  /// 错误色：柔和珊瑚红
  static const Color error = Color(0xFFFF6B81);

  /// 强调/高亮（紫）——保留兼容
  static const Color accent = Color(0xFFB39DDB);

  // ================= 新增：马卡龙 / 奶昔可爱辅助色 =================

  static const Color softPink = Color(0xFFFF9EC5);
  static const Color softYellow = Color(0xFFFFD76A);
  static const Color mint = Color(0xFF7ED9B7);
  static const Color creamOrange = Color(0xFFFFB07C);
  static const Color lavender = Color(0xFFB39DDB);

  /// 主色浅色版本，用于高亮 / 渐变背景
  static const Color primaryLight = Color(0xFFAEE3F5);

  /// 底部导航未选中态使用的柔和灰蓝（而非死灰）
  static const Color mutedIcon = Color(0xFFB9C4D6);

  // ================= 各模块主题色（让每类内容都有记忆点） =================

  /// 记忆 = 薄荷绿系
  static const Color memoryAccent = mint;

  /// 照片 = 奶油橙系
  static const Color photoAccent = creamOrange;

  /// 反思 = 薰衣草紫系
  static const Color reflectionAccent = lavender;

  /// 任务 = 天蓝系
  static const Color taskAccent = primary;

  /// 总结 = 暖黄系
  static const Color summaryAccent = softYellow;

  // ================= 渐变色组 =================

  static const List<Color> primaryGradient = [
    Color(0xFF82D3F0),
    Color(0xFF4AA8D8),
  ];

  static const List<Color> memoryGradient = [
    Color(0xFFB2EBD4),
    Color(0xFF6BC9A0),
  ];

  static const List<Color> photoGradient = [
    Color(0xFFFFD6B0),
    Color(0xFFFF9F6E),
  ];

  static const List<Color> reflectionGradient = [
    Color(0xFFDBCBF6),
    Color(0xFFAE91DF),
  ];

  static const List<Color> taskGradient = [
    Color(0xFFC1E8F8),
    Color(0xFF60B5DD),
  ];

  static const List<Color> summaryGradient = [
    Color(0xFFFFEDB0),
    Color(0xFFFFCE68),
  ];

  /// 页面整体柔和背景渐变（奶白 → 浅粉蓝）
  static const List<Color> pageBackgroundGradient = [
    Color(0xFFFFFBF6),
    Color(0xFFF1F7FF),
  ];
}

```

## lunar 包已核实 API（lunar ^1.7.8，勿臆造其它方法）
```dart
import 'package:lunar/lunar.dart';
final Solar solar = Solar.fromDate(DateTime(2026, 2, 17)); // 公历 → Solar
final Lunar lunar = solar.getLunar();
lunar.getYearInChinese();   // "二〇二六"
lunar.getMonthInChinese();  // "正"
lunar.getDayInChinese();    // "初一" / "十五" / "廿三" 等
lunar.getFestivals();       // List<String> 农历节日：春节/元宵/端午/七夕/中元/中秋/重阳/除夕...
lunar.getOtherFestivals();  // List<String> 其它节日
lunar.getJieQi();           // String 节气名（无则空字符串）：立春/雨水/清明/立夏/冬至...
lunar.getSolar();           // 转回 Solar
Solar.fromYmd(int year, int month, int day) 也可用
```

提示：页面现在用 intl DateFormat 显示月份/过去日标题，保留 intl 用法（zh_CN locale 已在 main 初始化）。
