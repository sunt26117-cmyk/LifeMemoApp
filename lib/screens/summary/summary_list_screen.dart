import 'package:flutter/material.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/summary.dart';
import 'package:ai_life_recorder/repositories/summary_repository.dart';
import 'package:ai_life_recorder/screens/annual/annual_screen.dart';
import 'package:ai_life_recorder/screens/summary/summary_detail_screen.dart';
import 'package:ai_life_recorder/services/annual_service.dart';
import 'package:ai_life_recorder/services/summary_service.dart';
import 'package:provider/provider.dart';

class SummaryListScreen extends StatefulWidget {
  const SummaryListScreen({
    super.key,
    required this.repository,
    required this.service,
  });

  final SummaryRepository repository;
  final SummaryService service;

  @override
  State<SummaryListScreen> createState() => _SummaryListScreenState();
}

class _SummaryListScreenState extends State<SummaryListScreen> {
  SummaryType _selectedType = SummaryType.weekly;

  bool _loading = true;
  bool _generating = false;

  String? _error;

  List<Summary> _summaries = <Summary>[];

  @override
  void initState() {
    super.initState();
    _loadSummaries();
  }

  Future<void> _loadSummaries() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      final summaries = await widget.repository.listAll();

      summaries.sort(
        (a, b) => b.periodStart.compareTo(a.periodStart),
      );

      if (!mounted) return;

      setState(() {
        _summaries = summaries;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _loading = false;
        _error = '加载失败';
      });
    }
  }

  List<Summary> _summariesOfType(SummaryType type) {
    return _summaries
        .where((summary) => summary.type == type)
        .toList();
  }

  Future<void> _generateCurrent() async {
    if (_generating) return;

    setState(() {
      _generating = true;
    });

    try {
      if (_selectedType == SummaryType.weekly) {
        await widget.service.generateWeekly();
      } else if (_selectedType == SummaryType.monthly) {
        await widget.service.generateMonthly();
      } else {
        await _generateAnnual();
        return;
      }

      await _loadSummaries();

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _selectedType == SummaryType.weekly
                ? '周回顾已生成'
                : '月回顾已生成',
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('生成失败：网络异常，请重试'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _generating = false;
        });
      }
    }
  }

  Future<void> _generateAnnual() async {
    try {
      final service = context.read<AnnualService>();
      final now = DateTime.now();

      final start = DateTime(
        now.year,
        1,
        1,
      );

      final end = DateTime(
        now.year,
        12,
        31,
        23,
        59,
        59,
      );

      final summary = await service.generateAnnualSummary(
        periodStart: start,
        periodEnd: end,
      );

      if (!mounted) return;

      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => AnnualScreen(
            summary: summary,
          ),
        ),
      );

      await _loadSummaries();
    } catch (_) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('生成失败：网络异常，请重试'),
        ),
      );
    }
  }

  Future<void> _deleteSummary(Summary summary) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('删除回顾'),
          content: Text(
            '确定删除${_typeName(summary.type)}？',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('取消'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text(
                '删除',
                style: TextStyle(
                  color: AppColors.error,
                ),
              ),
            ),
          ],
        );
      },
    );

    if (confirm != true) return;

    try {
      await widget.repository.delete(summary.id);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('已删除'),
        ),
      );

      await _loadSummaries();
    } catch (_) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('删除失败，请重试'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentSummaries =
        _summariesOfType(_selectedType);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('回顾'),
        actions: [
          IconButton(
            tooltip: _selectedType == SummaryType.yearly
                ? '生成年度回顾'
                : '生成回顾',
            onPressed: _generating
                ? null
                : _generateCurrent,
            icon: _generating
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                    ),
                  )
                : const Icon(
                    Icons.auto_awesome_rounded,
                  ),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              16,
              6,
              16,
              10,
            ),
            child: SegmentedButton<SummaryType>(
              segments: const [
                ButtonSegment(
                  value: SummaryType.weekly,
                  label: Text('周'),
                ),
                ButtonSegment(
                  value: SummaryType.monthly,
                  label: Text('月'),
                ),
                ButtonSegment(
                  value: SummaryType.yearly,
                  label: Text('年'),
                ),
              ],
              selected: {_selectedType},
              onSelectionChanged: (value) {
                setState(() {
                  _selectedType = value.first;
                });
              },
            ),
          ),
          Expanded(
            child: _buildBody(currentSummaries),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(List<Summary> summaries) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('加载失败，请重试'),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _loadSummaries,
              child: const Text('重试'),
            ),
          ],
        ),
      );
    }

    if (summaries.isEmpty) {
      return _emptyState();
    }

    switch (_selectedType) {
      case SummaryType.weekly:
        return _buildWeeklyList(summaries);
      case SummaryType.monthly:
        return _buildMonthlyList(summaries);
      case SummaryType.yearly:
        return _buildYearlyList(summaries);
    }
  }

  Widget _buildWeeklyList(List<Summary> summaries) {
    final grouped = <String, List<Summary>>{};

    for (final summary in summaries) {
      final start = summary.periodStart.toLocal();
      final key = '${start.year}-${start.month}';

      grouped.putIfAbsent(key, () => <Summary>[]).add(summary);
    }

    final keys = grouped.keys.toList()
      ..sort((a, b) {
        final aDate = _parseMonthKey(a);
        final bDate = _parseMonthKey(b);
        return bDate.compareTo(aDate);
      });

    return RefreshIndicator(
      onRefresh: _loadSummaries,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          16,
          8,
          16,
          28,
        ),
        itemCount: keys.length,
        itemBuilder: (context, index) {
          final key = keys[index];
          final items = grouped[key]!;
          final date = _parseMonthKey(key);

          items.sort(
            (a, b) => b.periodStart.compareTo(a.periodStart),
          );

          return _ReviewGroup(
            title: '${date.year}年${date.month}月',
            accent: AppColors.summaryAccent,
            children: items.map(
              (summary) {
                return _SummaryCard(
                  summary: summary,
                  title: _weeklyTitle(summary),
                  subtitle: _weeklySubtitle(summary),
                  onTap: () => _openSummary(summary),
                  onLongPress: () => _deleteSummary(summary),
                );
              },
            ).toList(),
          );
        },
      ),
    );
  }

  Widget _buildMonthlyList(List<Summary> summaries) {
    final grouped = <int, List<Summary>>{};

    for (final summary in summaries) {
      final year = summary.periodStart.toLocal().year;
      grouped.putIfAbsent(year, () => <Summary>[]).add(summary);
    }

    final years = grouped.keys.toList()
      ..sort((a, b) => b.compareTo(a));

    return RefreshIndicator(
      onRefresh: _loadSummaries,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          16,
          8,
          16,
          28,
        ),
        itemCount: years.length,
        itemBuilder: (context, index) {
          final year = years[index];
          final items = grouped[year]!;

          items.sort(
            (a, b) => b.periodStart.compareTo(a.periodStart),
          );

          return _ReviewGroup(
            title: '$year年',
            accent: AppColors.summaryAccent,
            children: items.map(
              (summary) {
                return _SummaryCard(
                  summary: summary,
                  title: _monthlyTitle(summary),
                  subtitle: _monthlySubtitle(summary),
                  onTap: () => _openSummary(summary),
                  onLongPress: () => _deleteSummary(summary),
                );
              },
            ).toList(),
          );
        },
      ),
    );
  }

  Widget _buildYearlyList(List<Summary> summaries) {
    final sorted = List<Summary>.from(summaries)
      ..sort(
        (a, b) => b.periodStart.compareTo(a.periodStart),
      );

    return RefreshIndicator(
      onRefresh: _loadSummaries,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(
          16,
          8,
          16,
          28,
        ),
        itemCount: sorted.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final summary = sorted[index];
          final year = summary.periodStart.toLocal().year;

          return _SummaryCard(
            summary: summary,
            title: '$year年',
            subtitle: _yearlySubtitle(summary),
            onTap: () => _openSummary(summary),
            onLongPress: () => _deleteSummary(summary),
            largeTitle: true,
          );
        },
      ),
    );
  }

  Future<void> _openSummary(Summary summary) async {
    if (summary.type == SummaryType.yearly) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => AnnualScreen(
            summary: summary,
          ),
        ),
      );
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => SummaryDetailScreen(
          summary: summary,
        ),
      ),
    );
  }

  Widget _emptyState() {
    final typeName = _typeName(_selectedType);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 82,
              height: 82,
              decoration: BoxDecoration(
                color:
                    AppColors.summaryAccent.withOpacity(0.16),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.auto_awesome_rounded,
                size: 36,
                color: Color(0xFFC99B35),
              ),
            ),
            const SizedBox(height: 15),
            Text(
              '还没有$typeName',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Color(0xFF3A4557),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              '等生活再走几步，回来看看自己。',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.neutral,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _generating
                  ? null
                  : _generateCurrent,
              icon: const Icon(
                Icons.auto_awesome_rounded,
                size: 18,
              ),
              label: Text('生成$typeName'),
            ),
          ],
        ),
      ),
    );
  }

  String _weeklyTitle(Summary summary) {
    final week = _isoWeekNumber(
      summary.periodStart.toLocal(),
    );

    final current = _isCurrentIsoWeek(
      summary.periodStart.toLocal(),
    );

    return current
        ? '本周'
        : '${summary.periodStart.toLocal().year}年第$week周';
  }

  String _weeklySubtitle(Summary summary) {
    final start = summary.periodStart.toLocal();
    final end = summary.periodEnd.toLocal();

    return '${start.month}月${start.day}日 — '
        '${end.month}月${end.day}日';
  }

  String _monthlyTitle(Summary summary) {
    final start = summary.periodStart.toLocal();
    return '${start.year}年${start.month}月';
  }

  String _monthlySubtitle(Summary summary) {
    final start = summary.periodStart.toLocal();
    final end = summary.periodEnd.toLocal();

    return '${start.month}月${start.day}日 — '
        '${end.month}月${end.day}日';
  }

  String _yearlySubtitle(Summary summary) {
    final start = summary.periodStart.toLocal();
    return '${start.year}年1月1日 — ${start.year}年12月31日';
  }

  bool _isCurrentIsoWeek(DateTime date) {
    final now = DateTime.now();
    return _isoWeekYear(date) == _isoWeekYear(now) &&
        _isoWeekNumber(date) == _isoWeekNumber(now);
  }

  int _isoWeekYear(DateTime date) {
    final value = DateTime(
      date.year,
      date.month,
      date.day,
    );

    final weekday = value.weekday;
    final thursday =
        value.add(Duration(days: 4 - weekday));

    return thursday.year;
  }

  int _isoWeekNumber(DateTime date) {
    final local = DateTime(
      date.year,
      date.month,
      date.day,
    );

    final weekday = local.weekday;
    final thursday =
        local.add(Duration(days: 4 - weekday));

    final firstThursday =
        DateTime(thursday.year, 1, 4);

    final firstThursdayWeekday =
        firstThursday.weekday;

    final firstWeekThursday = firstThursday.subtract(
      Duration(days: firstThursdayWeekday - 4),
    );

    return 1 +
        thursday
                .difference(firstWeekThursday)
                .inDays ~/
            7;
  }

  DateTime _parseMonthKey(String key) {
    final parts = key.split('-');

    return DateTime(
      int.parse(parts[0]),
      int.parse(parts[1]),
    );
  }

  String _typeName(SummaryType type) {
    switch (type) {
      case SummaryType.weekly:
        return '周回顾';
      case SummaryType.monthly:
        return '月回顾';
      case SummaryType.yearly:
        return '年度回顾';
    }
  }
}

class _ReviewGroup extends StatelessWidget {
  const _ReviewGroup({
    required this.title,
    required this.accent,
    required this.children,
  });

  final String title;
  final Color accent;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(
              left: 4,
              bottom: 8,
            ),
            child: Row(
              children: [
                Container(
                  width: 5,
                  height: 18,
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF3A4557),
                  ),
                ),
              ],
            ),
          ),
          ...children,
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.summary,
    required this.title,
    required this.subtitle,
    required this.onTap,
    required this.onLongPress,
    this.largeTitle = false,
  });

  final Summary summary;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final VoidCallback onLongPress;
  final bool largeTitle;

  @override
  Widget build(BuildContext context) {
    final content =
        summary.content?.trim() ?? '';

    final preview =
        content.length <= 110
            ? content
            : '${content.substring(0, 110)}…';

    final highlights = summary.highlights;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      color: Colors.white,
      surfaceTintColor: Colors.white,
      shadowColor:
          AppColors.summaryAccent.withOpacity(0.14),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        onLongPress: onLongPress,
        child: Padding(
          padding: const EdgeInsets.all(15),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: TextStyle(
                        fontSize: largeTitle ? 19 : 17,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF3A4557),
                      ),
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.mutedIcon,
                  ),
                ],
              ),
              const SizedBox(height: 5),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.neutral,
                ),
              ),
              if (preview.isNotEmpty) ...[
                const SizedBox(height: 11),
                Text(
                  preview,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.55,
                    color: Color(0xFF5C6677),
                  ),
                ),
              ],
              if (highlights.isNotEmpty) ...[
                const SizedBox(height: 11),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.auto_awesome_rounded,
                      size: 15,
                      color: Color(0xFFC99B35),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '亮点：${highlights.first}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF866A2A),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              const Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    '查看完整回顾 →',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.summaryAccent,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}