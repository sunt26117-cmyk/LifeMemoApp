// lib/screens/note/note_list_screen.dart
// 小记列表页（TASK-EXT-08）：搜索 + 时间倒序 + 新建/编辑/删除。
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ai_life_recorder/models/note.dart';
import 'package:ai_life_recorder/providers/note_provider.dart';
import 'package:ai_life_recorder/screens/note/note_edit_screen.dart';

class NoteListScreen extends StatefulWidget {
  const NoteListScreen({super.key});
  @override
  State<NoteListScreen> createState() => _NoteListScreenState();
}

class _NoteListScreenState extends State<NoteListScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<NoteProvider>().load();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _openEdit([Note? note]) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => NoteEditScreen(existing: note)),
    );
    if (mounted) await context.read<NoteProvider>().load();
  }

  Future<void> _confirmDelete(Note note) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除这条小记？'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('取消')),
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('删除')),
        ],
      ),
    );
    if (ok == true && mounted) {
      await context.read<NoteProvider>().delete(note.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NoteProvider>();
    final notes = provider.notes;
    return Scaffold(
      appBar: AppBar(title: const Text('小记')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: '搜索小记…',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.all(Radius.circular(12))),
                isDense: true,
              ),
              onChanged: (v) => provider.setKeyword(v),
            ),
          ),
          Expanded(
            child: notes.isEmpty
                ? Center(
                    child: Text(
                      provider.loaded ? '暂无小记，点右下角新建' : '加载中…',
                      style: const TextStyle(color: Colors.grey),
                    ),
                  )
                : ListView.separated(
                    itemCount: notes.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, i) {
                      final note = notes[i];
                      final title = (note.title == null || note.title!.isEmpty)
                          ? '无标题小记'
                          : note.title!;
                      return ListTile(
                        title: Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        subtitle: Text(
                          note.content,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (note.aiStatus == NoteAiStatus.success)
                              const Icon(Icons.auto_awesome,
                                  size: 16, color: Color(0xFF7C4DFF)),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 20),
                              onPressed: () => _confirmDelete(note),
                            ),
                          ],
                        ),
                        onTap: () => _openEdit(note),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'note_fab',
        onPressed: () => _openEdit(),
        backgroundColor: const Color(0xFF4A90D9),
        child: const Icon(Icons.edit_note, color: Colors.white),
      ),
    );
  }
}
