// lib/widgets/reflection_card.dart
// 反思摘要卡片：展示 ReflectionSummary 的六个段落与引用的记忆/照片列表
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/screens/memory/memory_detail_screen.dart';
import 'package:ai_life_recorder/screens/photo/photo_detail_screen.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';

/// 单段展示：图标 + 标题 + 正文
class _Section extends StatelessWidget {
  final IconData icon;
  final String title;
  final String content;

  const _Section(
      {required this.icon, required this.title, required this.content});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      color: AppColors.card,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppColors.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Text(content, style: const TextStyle(fontSize: 14)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 反思卡片组件
class ReflectionCard extends StatelessWidget {
  final ReflectionSummary summary;
  final List<Memory>? memories;
  final List<Photo>? photos;
  final VoidCallback? onEdit;

  const ReflectionCard({
    required this.summary,
    this.memories,
    this.photos,
    this.onEdit,
    super.key,
  });

  Widget _buildReferenceList<T>({
    required BuildContext context,
    required String title,
    required List<T>? items,
    required Widget Function(T item) itemBuilder,
  }) {
    if (items == null || items.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text('本次反思未引用其他记录',
            style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Text(title,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        ...items.map((it) => itemBuilder(it)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat.yMMMd();
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      color: AppColors.card,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 六段固定内容
            _Section(
                icon: Icons.event_note,
                title: '事件总结',
                content: summary.eventSummary),
            const SizedBox(height: 12),
            _Section(
                icon: Icons.thumb_up,
                title: '做得好的地方',
                content:
                    summary.goodPoints.isNotEmpty ? summary.goodPoints : '无'),
            const SizedBox(height: 12),
            _Section(
                icon: Icons.visibility_off,
                title: '可能忽略的因素',
                content: summary.ignoredFactors.isNotEmpty
                    ? summary.ignoredFactors
                    : '无'),
            const SizedBox(height: 12),
            _Section(
                icon: Icons.trending_up,
                title: '可以改进的地方',
                content: summary.improvementPoints.isNotEmpty
                    ? summary.improvementPoints
                    : '无'),
            const SizedBox(height: 12),
            _Section(
                icon: Icons.lightbulb_outline,
                title: '下次建议',
                content: summary.nextSuggestion),
            const SizedBox(height: 12),
            if (summary.suggestedTask != null)
              _Section(
                  icon: Icons.task_alt,
                  title: '建议创建的任务',
                  content: summary.suggestedTask!),
            const SizedBox(height: 12),
            // 引用区：记忆
            _buildReferenceList<Memory>(
              context: context,
              title: '相关记忆',
              items: memories,
              itemBuilder: (m) {
                final text = (m.title != null && m.title!.isNotEmpty)
                    ? m.title!
                    : (m.aiSummary ?? '记忆#');
                final date = dateFmt.format(m.createdAt);
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(text, style: const TextStyle(fontSize: 14)),
                  subtitle: Text(date,
                      style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => MemoryDetailScreen(memory: m)));
                  },
                );
              },
            ),
            const SizedBox(height: 8),
            // 引用区：照片
            _buildReferenceList<Photo>(
              context: context,
              title: '相关照片',
              items: photos,
              itemBuilder: (p) {
                final text = (p.aiSummary != null && p.aiSummary!.isNotEmpty)
                    ? p.aiSummary!
                    : '照片#';
                final date = dateFmt.format(p.takenAt);
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(text, style: const TextStyle(fontSize: 14)),
                  subtitle: Text(date,
                      style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => PhotoDetailScreen(photo: p)));
                  },
                );
              },
            ),
            const SizedBox(height: 8),
            // 编辑回调（可选）
            if (onEdit != null)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit, size: 18),
                  label: const Text('编辑'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
