import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'memory_edit_screen.dart';

class MemoryDetailScreen extends StatefulWidget {
  final Memory memory;
  const MemoryDetailScreen({super.key, required this.memory});
  @override
  State<MemoryDetailScreen> createState() => _MemoryDetailScreenState();
}

class _MemoryDetailScreenState extends State<MemoryDetailScreen> {
  late Memory _memory;
  late TextEditingController _summaryController;
  final DateFormat _dateFmt = DateFormat('yyyy-MM-dd');
  bool _saving = false;
  @override
  void initState() {
    super.initState();
    _memory = widget.memory;
    _summaryController = TextEditingController(text: _memory.aiSummary ?? '');
  }

  @override
  void dispose() {
    _summaryController.dispose();
    super.dispose();
  }

  Future<void> _onEdit() async {
    final provider = context.read<MemoryProvider>();
    final updated = await Navigator.of(context).push<Memory>(
        MaterialPageRoute(builder: (_) => MemoryEditScreen(memory: _memory)));
    if (updated != null && mounted) {
      setState(() {
        _memory = updated;
        _summaryController.text = updated.aiSummary ?? '';
      });
    }
    await provider.load();
  }

  Future<void> _onDelete() async {
    final provider = context.read<MemoryProvider>();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('删除确认'),
          content: const Text('删除这条记忆？'),
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
      await provider.delete(_memory.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('已删除')));
      Navigator.of(context).pop();
    } catch (e) {
      debugPrint('删除失败: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('删除失败，请重试')));
    }
  }

  Future<void> _saveSummary() async {
    final provider = context.read<MemoryProvider>();
    setState(() {
      _saving = true;
    });
    try {
      await provider.updateSummary(_memory.id, _summaryController.text.trim());
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('摘要已保存')));
      FocusScope.of(context).unfocus();
    } catch (e) {
      debugPrint('保存摘要失败: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('保存失败，请重试')));
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MemoryProvider>();
    final status = provider.summaryStatusOf(_memory.id);
    final dateStr = _dateFmt.format(_memory.createdAt.toLocal());
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('记忆详情',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            onPressed: _onEdit,
            icon: const Icon(Icons.edit),
            tooltip: '编辑',
          ),
          IconButton(
            onPressed: _onDelete,
            icon: const Icon(Icons.delete, color: AppColors.error),
            tooltip: '删除',
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(dateStr,
                    style: const TextStyle(fontSize: 14, color: Colors.grey)),
              ],
            ),
            const SizedBox(height: 8),
            if (_memory.tags.isNotEmpty)
              Align(
                alignment: Alignment.centerLeft,
                child: Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: _memory.tags.map((t) {
                    return Chip(
                        label: Text(t, style: const TextStyle(fontSize: 12)));
                  }).toList(),
                ),
              ),
            const SizedBox(height: 12),
            Card(
              color: Colors.white,
              elevation: 2,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(_memory.content,
                      style: const TextStyle(fontSize: 14)),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('AI 摘要',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: Card(
                color: Colors.white,
                elevation: 2,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _summaryController,
                          decoration: const InputDecoration(
                            hintText: '暂无摘要',
                            hintStyle: TextStyle(color: AppColors.neutral),
                            border: InputBorder.none,
                          ),
                          keyboardType: TextInputType.multiline,
                          maxLines: null,
                          minLines: 4,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          ElevatedButton(
                            onPressed: _saving ? null : _saveSummary,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8)),
                              minimumSize: const Size(120, 40),
                            ),
                            child: _saving
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2))
                                : const Text('保存摘要'),
                          ),
                          const SizedBox(width: 12),
                          // 手动重新生成：失败重试或成功后想再生成都可用（生成中禁用）
                          TextButton(
                            onPressed: status == MemorySummaryStatus.generating
                                ? null
                                : () => provider.retrySummary(_memory.id),
                            child: Text(
                              status == MemorySummaryStatus.generating
                                  ? '生成中…'
                                  : '重新生成',
                              style: TextStyle(
                                  color:
                                      status == MemorySummaryStatus.generating
                                          ? AppColors.neutral
                                          : AppColors.warning),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
