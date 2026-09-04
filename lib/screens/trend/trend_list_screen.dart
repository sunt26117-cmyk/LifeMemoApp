import 'package:flutter/material.dart';

import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/theme.dart';
import 'package:ai_life_recorder/models/trend.dart';
import 'package:ai_life_recorder/repositories/theme_repository.dart';
import 'package:ai_life_recorder/repositories/trend_repository.dart';
import 'package:ai_life_recorder/screens/trend/trend_detail_screen.dart';

class TrendListScreen extends StatefulWidget {
  const TrendListScreen({
    super.key,
    required this.trendRepository,
    required this.themeRepository,
  });

  final TrendRepository trendRepository;
  final ThemeRepository themeRepository;

  @override
  State<TrendListScreen> createState() => _TrendListScreenState();
}

class _TrendListScreenState extends State<TrendListScreen> {
  bool _loading = true;
  String? _error;
  List<Trend> _trends = <Trend>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final List<Trend> trends = await widget.trendRepository.listAll();
      trends.sort((a, b) => a.score.compareTo(b.score)); // 按 score 升序
      setState(() {
        _trends = trends;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = '加载失败：$e';
        _loading = false;
      });
    }
  }

  Color _directionColor(ThemeDirection direction) {
    switch (direction) {
      case ThemeDirection.improving:
        return const Color(0xFF4CAF50);
      case ThemeDirection.stable:
        return const Color(0xFF9E9E9E);
      case ThemeDirection.worsening:
        return const Color(0xFFF44336);
    }
  }

  Future<void> _showThemesDialog() async {
    List<ThemeItem> themes = <ThemeItem>[];
    String? error;
    try {
      themes = await widget.themeRepository.listAll();
    } catch (e) {
      error = '加载主题失败：$e';
    }

    if (!mounted) return;

    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('主题'),
          content: SizedBox(
            width: double.maxFinite,
            child: error != null
                ? Text(error, style: const TextStyle(color: Colors.red))
                : themes.isEmpty
                    ? const Text('暂无主题')
                    : ListView.builder(
                        shrinkWrap: true,
                        itemCount: themes.length,
                        itemBuilder: (context, index) {
                          final ThemeItem t = themes[index];
                          return ListTile(
                            leading: Icon(Icons.circle,
                                color: _directionColor(t.direction), size: 12),
                            title: Text(t.themeName),
                            subtitle: Text(
                                '权重: ${t.weight.toStringAsFixed(1)} · ${t.direction.value}'),
                          );
                        },
                      ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('关闭'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('趋势'),
        actions: [
          TextButton(
            onPressed: _showThemesDialog,
            child: const Text('主题', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _load,
                child: const Text('重试'),
              ),
            ),
          ],
        ),
      );
    }
    if (_trends.isEmpty) {
      return const Center(child: Text('暂无趋势数据（任务状态变更后会生成）'));
    }
    return ListView.builder(
      itemCount: _trends.length,
      itemBuilder: (context, index) {
        final Trend trend = _trends[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: ListTile(
            title: Row(
              children: [
                Expanded(
                    child:
                        Text(trend.trendName, overflow: TextOverflow.ellipsis)),
                Chip(label: Text(trend.category)),
              ],
            ),
            subtitle: Text(
                '分数: ${trend.score.toStringAsFixed(1)}  权重: ${trend.weight.toStringAsFixed(1)}'
                '  更新: ${trend.updatedAt}'),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _directionColor(trend.direction).withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                trend.direction.value,
                style: TextStyle(
                    color: _directionColor(trend.direction),
                    fontWeight: FontWeight.bold),
              ),
            ),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => TrendDetailScreen(
                    trend: trend,
                    themeRepository: widget.themeRepository,
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
