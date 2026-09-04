// lib/screens/note/note_edit_screen.dart
// 小记编辑页（TASK-EXT-08）：标题可选 + 正文 + 保存；AI 整理为可选异步，失败不污染原文。
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ai_life_recorder/models/note.dart';
import 'package:ai_life_recorder/providers/note_provider.dart';

class NoteEditScreen extends StatefulWidget {
  final Note? existing;
  const NoteEditScreen({super.key, this.existing});
  @override
  State<NoteEditScreen> createState() => _NoteEditScreenState();
}

class _NoteEditScreenState extends State<NoteEditScreen> {
  late final TextEditingController _titleController;
  late final TextEditingController _contentController;
  late final TextEditingController _organizeController;
  bool _saving = false;
  bool _organizing = false;
  String _organizeStatus = ''; // 用于展示 failed/generating 等

  @override
  void initState() {
    super.initState();
    final n = widget.existing;
    _titleController = TextEditingController(text: n?.title ?? '');
    _contentController = TextEditingController(text: n?.content ?? '');
    _organizeController = TextEditingController(text: n?.aiOrganized ?? '');
    if (n != null) _organizeStatus = _statusText(n.aiStatus);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    _organizeController.dispose();
    super.dispose();
  }

  String _statusText(NoteAiStatus s) {
    switch (s) {
      case NoteAiStatus.none:
        return '未整理';
      case NoteAiStatus.generating:
        return '整理中…';
      case NoteAiStatus.success:
        return '整理完成';
      case NoteAiStatus.failed:
        return '整理失败，可重试';
    }
  }

  Future<void> _onSave() async {
    final content = _contentController.text.trim();
    if (content.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('正文不能为空')));
      return;
    }
    setState(() => _saving = true);
    final provider = context.read<NoteProvider>();
    final titleInput = _titleController.text.trim();
    final saved = await provider.save(
      id: widget.existing?.id,
      title: titleInput.isEmpty ? null : titleInput,
      content: content,
      clearTitle: titleInput.isEmpty && widget.existing?.title != null,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (saved != null) {
      if (widget.existing == null) {
        // 新建：先落库成功再提示是否整理（AI 可选）
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('已保存')));
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('已保存')));
        Navigator.of(context).pop();
      }
    } else {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('保存失败，请重试')));
    }
  }

  Future<void> _onOrganize() async {
    final content = _contentController.text.trim();
    if (content.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('请先填写正文再整理')));
      return;
    }
    // 未保存时先落库，保证整理挂到持久化的记录上
    final provider = context.read<NoteProvider>();
    var targetId = widget.existing?.id;
    if (targetId == null) {
      setState(() => _saving = true);
      final saved = await provider.save(
        title: _titleController.text.trim().isEmpty
            ? null
            : _titleController.text.trim(),
        content: content,
      );
      setState(() => _saving = false);
      if (saved == null) return;
      targetId = saved.id;
    }
    setState(() {
      _organizing = true;
      _organizeStatus = '整理中…';
    });
    await provider.organize(targetId);
    if (!mounted) return;
    // 从 provider 取最新状态同步到本地控制器
    final providerNow = context.read<NoteProvider>();
    Note? latest;
    for (final n in providerNow.notes) {
      if (n.id == targetId) {
        latest = n;
        break;
      }
    }
    setState(() {
      _organizing = false;
      if (latest != null) {
        _organizeController.text = latest.aiOrganized ?? '';
        _organizeStatus = _statusText(latest.aiStatus);
      }
    });
    if (latest != null && latest.aiStatus == NoteAiStatus.failed) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('整理失败，原文未受影响，可稍后重试')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.existing == null ? '新建小记' : '编辑小记'),
        actions: [
          TextButton(
            onPressed: _saving ? null : _onSave,
            child: const Text('保存'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: '标题（可选）',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _contentController,
              minLines: 6,
              maxLines: 12,
              keyboardType: TextInputType.multiline,
              decoration: const InputDecoration(
                labelText: '正文',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: (_organizing || _saving) ? null : _onOrganize,
                    icon: _organizing
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.auto_awesome, size: 18),
                    label: Text(_organizing ? '整理中…' : 'AI 整理'),
                  ),
                ),
                if (_organizeStatus.isNotEmpty) ...[
                  const SizedBox(width: 12),
                  Text(
                    _organizeStatus,
                    style: TextStyle(
                      fontSize: 12,
                      color: _organizeStatus.contains('失败')
                          ? Colors.orange
                          : Colors.grey,
                    ),
                  ),
                ],
              ],
            ),
            if (_organizeController.text.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text(
                'AI 整理结果（仅展示，不覆盖原文）',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF2F7FD),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _organizeController.text,
                  style: const TextStyle(height: 1.5),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
