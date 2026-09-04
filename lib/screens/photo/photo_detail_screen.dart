import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:intl/intl.dart';

class PhotoDetailScreen extends StatefulWidget {
  final Photo photo;
  const PhotoDetailScreen({super.key, required this.photo});
  @override
  State<PhotoDetailScreen> createState() => _PhotoDetailScreenState();
}

class _PhotoDetailScreenState extends State<PhotoDetailScreen> {
  late TextEditingController _summaryController;
  bool _generating = false;
  bool _saving = false;
  @override
  void initState() {
    super.initState();
    _summaryController =
        TextEditingController(text: widget.photo.aiSummary ?? '');
  }

  @override
  void dispose() {
    _summaryController.dispose();
    super.dispose();
  }

  Future<void> _onDelete() async {
    final provider = context.read<PhotoProvider>();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('删除确认'),
          content: const Text('删除这张照片？'),
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
      await provider.deletePhoto(widget.photo.id);
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

  Future<void> _generateSummary() async {
    final provider = context.read<PhotoProvider>();
    setState(() {
      _generating = true;
    });
    try {
      await provider.generateSummary(widget.photo);
      await provider.load();
      final updated = provider.byId(widget.photo.id);
      if (updated != null) {
        _summaryController.text = updated.aiSummary ?? '';
      }
    } catch (e) {
      debugPrint('生成摘要失败: $e');
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('生成摘要失败，请重试')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _generating = false;
        });
      }
    }
  }

  Future<void> _saveSummary() async {
    final provider = context.read<PhotoProvider>();
    setState(() {
      _saving = true;
    });
    try {
      provider.setSummary(widget.photo.id, _summaryController.text.trim());
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('摘要已保存')));
      }
    } catch (e) {
      debugPrint('保存摘要失败: $e');
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('保存失败，请重试')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  Future<void> _confirmSummary() async {
    final provider = context.read<PhotoProvider>();
    try {
      await provider.confirmSummary(widget.photo.id);
      await provider.load();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('已确认')));
      }
    } catch (e) {
      debugPrint('确认摘要失败: $e');
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('确认失败，请重试')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PhotoProvider>();
    final p = provider.byId(widget.photo.id) ?? widget.photo;
    final dateStr = DateFormat('yyyy-MM-dd HH:mm').format(p.takenAt.toLocal());
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('照片详情',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
        actions: [
          IconButton(
            onPressed: _onDelete,
            icon: const Icon(Icons.delete, color: AppColors.error),
            tooltip: '删除',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: _buildLargeImage(p),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(dateStr,
                    style: const TextStyle(fontSize: 14, color: Colors.grey)),
              ],
            ),
            if ((p.metadata['caption'] as String?)?.isNotEmpty ?? false) ...[
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  p.metadata['caption'] as String,
                  style: const TextStyle(
                      fontSize: 15, height: 1.5, color: Color(0xFF3A4557)),
                ),
              ),
            ],
            if ((p.metadata['address'] as String?)?.isNotEmpty ?? false) ...[
              const SizedBox(height: 6),
              Align(
                alignment: Alignment.centerLeft,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.place_rounded,
                        size: 15, color: AppColors.mutedIcon),
                    const SizedBox(width: 4),
                    Text(
                      p.metadata['address'] as String,
                      style: const TextStyle(
                          fontSize: 13, color: AppColors.neutral),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 8),
            if (p.tags.isNotEmpty)
              Align(
                alignment: Alignment.centerLeft,
                child: Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: p.tags.map((t) => Chip(label: Text(t))).toList(),
                ),
              ),
            const SizedBox(height: 12),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('AI 摘要',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 8),
            Card(
              color: Colors.white,
              elevation: 2,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  children: [
                    if ((p.aiSummary == null || p.aiSummary!.trim().isEmpty) &&
                        !p.summaryConfirmed)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        child: Center(
                          child: _generating
                              ? const CircularProgressIndicator()
                              : ElevatedButton(
                                  onPressed: _generateSummary,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8)),
                                    minimumSize: const Size(140, 40),
                                  ),
                                  child: const Text('生成摘要'),
                                ),
                        ),
                      )
                    else
                      TextField(
                        controller: _summaryController,
                        decoration: const InputDecoration(
                          hintText: '暂无摘要',
                          hintStyle: TextStyle(color: AppColors.neutral),
                          border: InputBorder.none,
                        ),
                        keyboardType: TextInputType.multiline,
                        maxLines: 6,
                        minLines: 4,
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
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2))
                              : const Text('保存摘要'),
                        ),
                        const SizedBox(width: 12),
                        if (!p.summaryConfirmed)
                          TextButton(
                            onPressed: _confirmSummary,
                            child: const Text('确认',
                                style: TextStyle(color: AppColors.success)),
                          )
                        else
                          const Padding(
                            padding: EdgeInsets.only(left: 8.0),
                            child: Text('已确认，可被反思引用',
                                style: TextStyle(
                                    color: AppColors.success, fontSize: 12)),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLargeImage(Photo p) {
    try {
      final file = File(p.localPath);
      if (!file.existsSync()) {
        return Container(
          height: 240,
          color: Colors.grey.shade200,
          child: const Center(
              child: Icon(Icons.broken_image, size: 60, color: Colors.grey)),
        );
      }
      return Image.file(file,
          width: double.infinity, height: 240, fit: BoxFit.cover);
    } catch (e) {
      debugPrint('加载大图失败: $e');
      return Container(
        height: 240,
        color: Colors.grey.shade200,
        child: const Center(
            child: Icon(Icons.broken_image, size: 60, color: Colors.grey)),
      );
    }
  }
}
