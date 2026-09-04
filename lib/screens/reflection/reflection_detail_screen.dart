// lib/screens/reflection/reflection_detail_screen.dart
// 反思详情页：展示原始记录与 AI 生成的 Summary（若有），支持编辑与创建任务
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/widgets/reflection_card.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/task_prefill.dart';
import 'package:ai_life_recorder/screens/task/task_edit_screen.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/repositories/reflection_repository.dart';
import 'reflection_edit_screen.dart';

class ReflectionDetailScreen extends StatefulWidget {
  final Reflection reflection;
  final ReflectionRepository repository;
  final List<Memory>? memories;
  final List<Photo>? photos;

  const ReflectionDetailScreen({
    super.key,
    required this.reflection,
    required this.repository,
    this.memories,
    this.photos,
  });

  @override
  State<ReflectionDetailScreen> createState() => _ReflectionDetailScreenState();
}

class _ReflectionDetailScreenState extends State<ReflectionDetailScreen> {
  late Reflection _reflection;

  @override
  void initState() {
    super.initState();
    _reflection = widget.reflection;
  }

  Future<void> _openEdit() async {
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ReflectionEditScreen(existingReflection: _reflection),
    ));
    // 编辑保存后回到详情页，重新拉取最新数据刷新
    final refreshed = await widget.repository.getById(_reflection.id);
    if (refreshed != null && mounted) {
      setState(() => _reflection = refreshed);
    }
  }

  Future<void> _onDelete() async {
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
      await widget.repository.delete(_reflection.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('已删除')));
      Navigator.of(context).pop();
    } catch (e) {
      debugPrint('删除反思失败: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('删除失败，请重试')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat.yMMMd();
    final reflection = _reflection;
    // 从 aiSummary 构造 ReflectionSummary（若 aiSummary 存在）
    ReflectionSummary? aiSummary;
    if (reflection.aiSummary != null) {
      try {
        aiSummary = ReflectionSummary.fromJson(
            Map<String, dynamic>.from(reflection.aiSummary!));
      } catch (_) {
        aiSummary = null;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('反思详情'),
        actions: [
          IconButton(
            onPressed: _openEdit,
            icon: const Icon(Icons.edit_outlined),
            tooltip: '编辑',
          ),
          IconButton(
            onPressed: _onDelete,
            icon: const Icon(Icons.delete, color: AppColors.error),
            tooltip: '删除',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 原始记录卡片
            Card(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              elevation: 2,
              color: AppColors.card,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('原始记录',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    if (reflection.eventDescription.isNotEmpty)
                      Text(reflection.eventDescription,
                          style: const TextStyle(fontSize: 14)),
                    if (reflection.emotion != null &&
                        reflection.emotion!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8)),
                        child: Text(reflection.emotion!,
                            style: const TextStyle(color: AppColors.primary)),
                      ),
                    ],
                    if (reflection.actionTaken != null &&
                        reflection.actionTaken!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text('行动：${reflection.actionTaken}',
                          style: const TextStyle(fontSize: 14)),
                    ],
                    if (reflection.result != null &&
                        reflection.result!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text('结果：${reflection.result}',
                          style: const TextStyle(fontSize: 14)),
                    ],
                    const SizedBox(height: 8),
                    Text('创建于 ${dateFmt.format(reflection.createdAt)}',
                        style:
                            TextStyle(fontSize: 12, color: Colors.grey[600])),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            // AI Summary 区
            if (aiSummary != null) ...[
              ReflectionCard(
                  summary: aiSummary,
                  memories: widget.memories,
                  photos: widget.photos),
            ] else
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text('该反思尚未生成 AI 总结',
                    style: TextStyle(fontSize: 14, color: Colors.grey[600])),
              ),
            const SizedBox(height: 12),
            // 创建任务按钮（若 aiSummary.suggestedTask 存在）
            if (aiSummary != null && aiSummary.suggestedTask != null)
              SizedBox(
                height: 48,
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    final prefill = TaskPrefill(
                      title: aiSummary!.suggestedTask!,
                      description: aiSummary.eventSummary,
                      sourceReflectionId: reflection.id,
                      defaultCategory: TaskCategory.planning,
                    );
                    Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => TaskEditScreen(prefill: prefill)));
                  },
                  icon: const Icon(Icons.add_task),
                  label: const Text('创建任务'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('完成'),
            ),
          ],
        ),
      ),
    );
  }
}