// lib/screens/reflection/reflection_list_screen.dart
// 反思列表页：从仓库加载反思并按时间倒序展示，点击进入详情
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_detail_screen.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_edit_screen.dart';
import 'package:ai_life_recorder/repositories/reflection_repository.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';

/// 反思列表页（按 createdAt 倒序）
class ReflectionListScreen extends StatefulWidget {
  final ReflectionRepository repository;
  final List<Memory>? memories;
  final List<Photo>? photos;

  const ReflectionListScreen({
    super.key,
    required this.repository,
    this.memories,
    this.photos,
  });

  @override
  State<ReflectionListScreen> createState() => _ReflectionListScreenState();
}

class _ReflectionListScreenState extends State<ReflectionListScreen> {
  bool _loading = true;
  String? _error;
  List<Reflection> _list = [];

  @override
  void initState() {
    super.initState();
    _loadList();
  }

  Future<void> _loadList() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await widget.repository.list();
      // 按 createdAt 倒序（新到旧）
      items.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      setState(() {
        _list = items;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = '加载失败';
        _loading = false;
      });
    }
  }

  Future<void> _onDeleteReflection(BuildContext context, Reflection r) async {
    final messenger = ScaffoldMessenger.of(context);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('删除确认'),
          content: const Text('删除这条反思？'),
          actions: [
            TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('取消')),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('删除', style: TextStyle(color: AppColors.error)),
            ),
          ],
        );
      },
    );
    if (confirm != true) return;
    try {
      await widget.repository.delete(r.id);
      if (!mounted) return;
      messenger.showSnackBar(const SnackBar(content: Text('已删除')));
      await _loadList();
    } catch (e) {
      debugPrint('删除反思失败: $e');
      if (!mounted) return;
      messenger.showSnackBar(const SnackBar(content: Text('删除失败，请重试')));
    }
  }

  Widget _buildCard(BuildContext context, Reflection r) {
    final dateFmt = DateFormat.yMMMd();
    // 标题优先使用 aiSummary.eventSummary
    String title = r.eventDescription;
    if (r.aiSummary != null && r.aiSummary is Map<String, dynamic>) {
      final map = Map<String, dynamic>.from(r.aiSummary!);
      final es = map['eventSummary'];
      if (es != null && es.toString().trim().isNotEmpty) {
        title = es.toString();
      }
    }
    final emotionText = r.emotion;
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 2,
      color: AppColors.card,
      surfaceTintColor: Colors.white,
      shadowColor: AppColors.reflectionAccent.withOpacity(0.16),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () async {
          await Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => ReflectionDetailScreen(
                reflection: r,
                repository: widget.repository,
                memories: widget.memories,
                photos: widget.photos),
          ));
          if (mounted) await _loadList();
        },
        onLongPress: () => _onDeleteReflection(context, r),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标题与情绪/日期/人工确认
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w600),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(dateFmt.format(r.createdAt),
                          style:
                              TextStyle(fontSize: 12, color: Colors.grey[600])),
                      const SizedBox(height: 6),
                      if (r.isUserConfirmed)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                              color: Colors.grey.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8)),
                          child: const Text('人工确认',
                              style: TextStyle(
                                  fontSize: 12, color: Colors.black54)),
                        ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // 情绪 chip
              if (emotionText != null && emotionText.isNotEmpty)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                      color: AppColors.reflectionAccent.withOpacity(0.14),
                      borderRadius: BorderRadius.circular(14)),
                  child: Text(emotionText,
                      style: const TextStyle(
                          color: AppColors.reflectionAccent,
                          fontWeight: FontWeight.w600)),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('反思')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('反思')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!,
                  style: const TextStyle(fontSize: 14, color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _loadList,
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      );
    }

    if (_list.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('反思')),
        body: Center(
            child: Text('暂无反思记录',
                style: TextStyle(fontSize: 14, color: Colors.grey[600]))),
        floatingActionButton: _buildFab(context),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('反思')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView.separated(
          itemCount: _list.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final r = _list[index];
            return _buildCard(context, r);
          },
        ),
      ),
      floatingActionButton: _buildFab(context),
    );
  }

  Widget _buildFab(BuildContext context) {
    return FloatingActionButton(
      heroTag: 'reflection_fab',
      onPressed: () async {
        await Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const ReflectionEditScreen()),
        );
        if (mounted) await _loadList();
      },
      backgroundColor: Colors.transparent,
      elevation: 2,
      shape: const CircleBorder(),
      child: Container(
        width: 56,
        height: 56,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            colors: AppColors.reflectionGradient,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
    );
  }
}