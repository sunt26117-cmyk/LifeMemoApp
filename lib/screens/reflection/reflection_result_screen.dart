// lib/screens/reflection/reflection_result_screen.dart
// 反思生成结果页（只读），支持跳转到 TaskEditScreen 以预填任务
import 'package:flutter/material.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/models/task_prefill.dart';
import 'package:ai_life_recorder/screens/task/task_edit_screen.dart';
import 'package:ai_life_recorder/widgets/reflection_card.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/constants/enums.dart';

/// 生成结果页
class ReflectionResultScreen extends StatelessWidget {
  final ReflectionSummary summary;
  final String sourceReflectionId;
  final TaskCategory defaultCategory;
  final List<Memory>? memories;
  final List<Photo>? photos;
  final VoidCallback? onRegenerate;

  const ReflectionResultScreen({
    super.key,
    required this.summary,
    required this.sourceReflectionId,
    this.defaultCategory = TaskCategory.planning,
    this.memories,
    this.photos,
    this.onRegenerate,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('反思结果')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            ReflectionCard(
                summary: summary, memories: memories, photos: photos),
            const SizedBox(height: 12),
            // 只读信息：引用数量提示
            Row(
              children: [
                Text('引用：',
                    style: TextStyle(fontSize: 14, color: Colors.grey[700])),
                const SizedBox(width: 8),
                Text(
                    '记忆 ${summary.citations.memoryIds.length} 条，照片 ${summary.citations.photoIds.length} 张',
                    style: const TextStyle(fontSize: 14)),
              ],
            ),
          ],
        ),
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            if (summary.suggestedTask != null)
              Expanded(
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      final prefill = TaskPrefill(
                        title: summary.suggestedTask!,
                        description: summary.eventSummary,
                        sourceReflectionId: sourceReflectionId,
                        defaultCategory: defaultCategory,
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
              ),
            if (summary.suggestedTask != null) const SizedBox(width: 12),
            OutlinedButton(
              onPressed: () {
                // 触发回调并返回（调用方负责回编辑页保留草稿）
                onRegenerate?.call();
                Navigator.of(context).pop();
              },
              child: const Text('重新生成'),
            ),
            const SizedBox(width: 12),
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
