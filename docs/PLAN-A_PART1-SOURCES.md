# 方案A 派单 · 文件 1/2：现有源码

> 以下是需要修改文件的当前真实完整源码（除 home_screen 只给相关区域）。
> 请基于这些源码修改，输出完整新文件（非 diff）。修改要求见「文件 2」。

```dart
// ===== FILE: lib/models/memory.dart =====
class Memory {
  final String id;
  final String? title;
  final String content;
  final List<String> tags;
  final String? aiSummary;
  final List<String> relatedMediaIds;
  final DateTime createdAt;
  Memory({
    required this.id,
    this.title,
    required this.content,
    List<String>? tags,
    this.aiSummary,
    List<String>? relatedMediaIds,
    DateTime? createdAt,
  })  : tags = tags ?? <String>[],
        relatedMediaIds = relatedMediaIds ?? <String>[],
        createdAt = (createdAt ?? DateTime.now().toUtc());
  factory Memory.fromJson(Map<String, dynamic> map) {
    return Memory(
      id: map['id'] as String,
      title: map['title'] as String?,
      content: map['content'] as String,
      tags: (map['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          <String>[],
      aiSummary: map['ai_summary'] as String?,
      relatedMediaIds: (map['related_media_ids'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      createdAt: map['created_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(map['created_at'] as String),
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      'tags': tags,
      'ai_summary': aiSummary,
      'related_media_ids': relatedMediaIds,
      'created_at': createdAt.toUtc().toIso8601String(),
    };
  }

  Memory copyWith({
    String? id,
    String? title,
    String? content,
    List<String>? tags,
    String? aiSummary,
    List<String>? relatedMediaIds,
    DateTime? createdAt,
  }) {
    return Memory(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      tags: tags ?? List<String>.from(this.tags),
      aiSummary: aiSummary ?? this.aiSummary,
      relatedMediaIds:
          relatedMediaIds ?? List<String>.from(this.relatedMediaIds),
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

```

```dart
// ===== FILE: lib/models/photo.dart =====
class Photo {
  final String id;
  final String localPath;
  final DateTime takenAt;
  final String? aiSummary;
  final bool summaryConfirmed;
  final List<String> tags;
  final List<String> relatedMemoryIds;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  Photo({
    required this.id,
    required this.localPath,
    required this.takenAt,
    this.aiSummary,
    this.summaryConfirmed = false,
    List<String>? tags,
    List<String>? relatedMemoryIds,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
  })  : tags = tags ?? <String>[],
        relatedMemoryIds = relatedMemoryIds ?? <String>[],
        metadata = metadata ?? <String, dynamic>{},
        createdAt = (createdAt ?? DateTime.now().toUtc());
  factory Photo.fromJson(Map<String, dynamic> map) {
    return Photo(
      id: map['id'] as String,
      localPath: map['local_path'] as String,
      takenAt: DateTime.parse(map['taken_at'] as String),
      aiSummary: map['ai_summary'] as String?,
      summaryConfirmed: map['summary_confirmed'] as bool? ?? false,
      tags: (map['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          <String>[],
      relatedMemoryIds: (map['related_memory_ids'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          <String>[],
      metadata:
          (map['metadata'] as Map<String, dynamic>?) ?? <String, dynamic>{},
      createdAt: map['created_at'] == null
          ? DateTime.now().toUtc()
          : DateTime.parse(map['created_at'] as String),
    );
  }
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'local_path': localPath,
      'taken_at': takenAt.toUtc().toIso8601String(),
      'ai_summary': aiSummary,
      'summary_confirmed': summaryConfirmed,
      'tags': tags,
      'related_memory_ids': relatedMemoryIds,
      'metadata': metadata,
      'created_at': createdAt.toUtc().toIso8601String(),
    };
  }

  Photo copyWith({
    String? id,
    String? localPath,
    DateTime? takenAt,
    String? aiSummary,
    bool? summaryConfirmed,
    List<String>? tags,
    List<String>? relatedMemoryIds,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
  }) {
    return Photo(
      id: id ?? this.id,
      localPath: localPath ?? this.localPath,
      takenAt: takenAt ?? this.takenAt,
      aiSummary: aiSummary ?? this.aiSummary,
      summaryConfirmed: summaryConfirmed ?? this.summaryConfirmed,
      tags: tags ?? List<String>.from(this.tags),
      relatedMemoryIds:
          relatedMemoryIds ?? List<String>.from(this.relatedMemoryIds),
      metadata: metadata ?? Map<String, dynamic>.from(this.metadata),
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

```

```dart
// ===== FILE: lib/providers/memory_provider.dart =====
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/repositories/memory_repository.dart';
import 'package:ai_life_recorder/ai/memory_ai.dart';
import 'package:ai_life_recorder/utils/fuzzy_search.dart';

enum MemorySummaryStatus { none, generating, success, failed }

class MemoryProvider extends ChangeNotifier {
  static const int _pageSize = 20;

  final MemoryRepository repository;
  final MemoryAi? memoryAi;
  MemoryProvider({required this.repository, this.memoryAi});
  final List<Memory> _memories = [];
  String _keyword = '';
  final Set<String> _selectedTags = <String>{};
  final Map<String, MemorySummaryStatus> _summaryStatuses = {};
  int _offset = 0;
  bool _hasMore = true;
  bool _loadingMore = false;

  bool get hasMore => _hasMore;
  bool get isLoadingMore => _loadingMore;

  List<Memory> get allMemories => List.unmodifiable(_memories);
  List<Memory> get memories {
    final kw = _keyword.trim();
    return _memories.where((m) {
      if (_selectedTags.isNotEmpty) {
        final hit = m.tags.any((t) => _selectedTags.contains(t));
        if (!hit) return false;
      }
      if (kw.isNotEmpty) {
        // TASK-EXT-11：模糊 OR 搜索（任一关键词命中即可）
        final matched = fuzzyMatches(
          title: m.title ?? '',
          content: m.content,
          tags: m.tags,
          query: kw,
        );
        if (!matched) return false;
      }
      return true;
    }).toList(growable: false);
  }

  List<String> get allTags {
    final seen = <String>{};
    final list = <String>[];
    for (var m in _memories) {
      for (var t in m.tags) {
        if (!seen.contains(t)) {
          seen.add(t);
          list.add(t);
        }
      }
    }
    return list;
  }

  MemorySummaryStatus summaryStatusOf(String id) {
    return _summaryStatuses[id] ?? MemorySummaryStatus.none;
  }

  Future<void> load() async {
    try {
      _offset = 0;
      _hasMore = true;
      final items = await repository.list(limit: _pageSize, offset: 0);
      _memories
        ..clear()
        ..addAll(items);
      _memories.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      _offset = items.length;
      _hasMore = items.length >= _pageSize;
      notifyListeners();
    } catch (e) {
      debugPrint('MemoryProvider.load error: $e');
    }
  }

  Future<void> loadMore() async {
    if (_loadingMore || !_hasMore) return;
    _loadingMore = true;
    notifyListeners();
    try {
      final items = await repository.list(limit: _pageSize, offset: _offset);
      final existingIds = _memories.map((m) => m.id).toSet();
      final newItems = items.where((m) => !existingIds.contains(m.id)).toList();
      _memories.addAll(newItems);
      _memories.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      _offset += items.length;
      _hasMore = items.length >= _pageSize;
    } catch (e) {
      debugPrint('MemoryProvider.loadMore error: $e');
    } finally {
      _loadingMore = false;
      notifyListeners();
    }
  }

  Future<Memory?> save({
    String? id,
    String? title,
    required String content,
    required List<String> tags,
  }) async {
    final now = DateTime.now().toUtc();
    final memId = id ?? const Uuid().v4();
    final memory = Memory(
      id: memId,
      title: title,
      content: content,
      tags: List<String>.from(tags),
      aiSummary: null,
      relatedMediaIds: const [],
      createdAt: now,
    );
    try {
      await repository.upsert(memory);
      await load();
    } catch (e) {
      debugPrint('MemoryProvider.save upsert error: $e');
      return null;
    }
    if (memoryAi != null) {
      _setSummaryStatus(memId, MemorySummaryStatus.generating);
      () async {
        try {
          final summary = await memoryAi!.generateSummary(
            content: content,
            tags: tags,
          );
          try {
            await repository.updateSummary(memId, summary);
            _setSummaryStatus(memId, MemorySummaryStatus.success);
            final idx = _memories.indexWhere((m) => m.id == memId);
            if (idx != -1) {
              final updated = _memories[idx].copyWith(aiSummary: summary);
              _memories[idx] = updated;
              notifyListeners();
            } else {
              await load();
            }
          } catch (e) {
            debugPrint('MemoryProvider.save updateSummary error: $e');
            _setSummaryStatus(memId, MemorySummaryStatus.failed);
          }
        } catch (e) {
          debugPrint('MemoryProvider.save generateSummary error: $e');
          _setSummaryStatus(memId, MemorySummaryStatus.failed);
        }
      }();
    }
    return _memories.firstWhere((m) => m.id == memId, orElse: () => memory);
  }

  Future<void> retrySummary(String id) async {
    final status = _summaryStatuses[id] ?? MemorySummaryStatus.none;
    if (status != MemorySummaryStatus.failed) return;
    Memory? mem;
    for (final m in _memories) {
      if (m.id == id) {
        mem = m;
        break;
      }
    }
    if (mem == null) return;
    final Memory m = mem;
    if (memoryAi == null) return;
    _setSummaryStatus(id, MemorySummaryStatus.generating);
    () async {
      try {
        final summary = await memoryAi!.generateSummary(
          content: m.content,
          tags: m.tags,
        );
        try {
          await repository.updateSummary(id, summary);
          _setSummaryStatus(id, MemorySummaryStatus.success);
          final idx = _memories.indexWhere((m) => m.id == id);
          if (idx != -1) {
            _memories[idx] = _memories[idx].copyWith(aiSummary: summary);
            notifyListeners();
          } else {
            await load();
          }
        } catch (e) {
          debugPrint('MemoryProvider.retrySummary updateSummary error: $e');
          _setSummaryStatus(id, MemorySummaryStatus.failed);
        }
      } catch (e) {
        debugPrint('MemoryProvider.retrySummary generateSummary error: $e');
        _setSummaryStatus(id, MemorySummaryStatus.failed);
      }
    }();
  }

  Future<void> delete(String id) async {
    try {
      await repository.delete(id);
      await load();
    } catch (e) {
      debugPrint('MemoryProvider.delete error: $e');
    }
  }

  void setKeyword(String kw) {
    _keyword = kw;
    notifyListeners();
  }

  void toggleTag(String tag) {
    if (_selectedTags.contains(tag)) {
      _selectedTags.remove(tag);
    } else {
      _selectedTags.add(tag);
    }
    notifyListeners();
  }

  void clearFilters() {
    _keyword = '';
    _selectedTags.clear();
    notifyListeners();
  }

  void _setSummaryStatus(String id, MemorySummaryStatus status) {
    _summaryStatuses[id] = status;
    notifyListeners();
  }

  Future<void> updateSummary(String id, String aiSummary) async {
    try {
      await repository.updateSummary(id, aiSummary);
      final idx = _memories.indexWhere((m) => m.id == id);
      if (idx != -1) {
        _memories[idx] = _memories[idx].copyWith(aiSummary: aiSummary);
        notifyListeners();
      }
      await load();
    } catch (e) {
      debugPrint('MemoryProvider.updateSummary error: $e');
    }
  }
}

```

```dart
// ===== FILE: lib/screens/memory/memory_edit_screen.dart =====
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/widgets/tag_input_widget.dart';
import 'package:ai_life_recorder/constants/app_colors.dart';

class MemoryEditScreen extends StatefulWidget {
  final Memory? memory;
  const MemoryEditScreen({super.key, this.memory});
  @override
  State<MemoryEditScreen> createState() => _MemoryEditScreenState();
}

class _MemoryEditScreenState extends State<MemoryEditScreen> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _contentController = TextEditingController();
  List<String> _tags = <String>[];
  bool _saving = false;
  @override
  void initState() {
    super.initState();
    final m = widget.memory;
    if (m != null) {
      _titleController.text = m.title ?? '';
      _contentController.text = m.content;
      _tags = List<String>.from(m.tags);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _onSave() async {
    final content = _contentController.text.trim();
    if (content.isEmpty) return;
    setState(() {
      _saving = true;
    });
    final provider = context.read<MemoryProvider>();
    try {
      final saved = await provider.save(
        id: widget.memory?.id,
        title: _titleController.text.trim().isEmpty
            ? null
            : _titleController.text.trim(),
        content: content,
        tags: _tags,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('已保存')));
      Navigator.of(context).pop(saved);
    } catch (e) {
      debugPrint('保存失败: $e');
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
    final isContentEmpty = _contentController.text.trim().isEmpty;
    final titleText = widget.memory == null ? '新建记忆' : '编辑记忆';
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(titleText,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                hintText: '标题（可选）',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _contentController,
              decoration: const InputDecoration(
                hintText: '记录点什么…',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              keyboardType: TextInputType.multiline,
              maxLines: 6,
              minLines: 4,
              onChanged: (_) {
                setState(() {});
              },
            ),
            const SizedBox(height: 12),
            TagInputWidget(
              initialTags: _tags,
              onChanged: (newTags) {
                setState(() {
                  _tags = newTags;
                });
              },
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: isContentEmpty || _saving ? null : _onSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  disabledBackgroundColor: AppColors.neutral,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('保存', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

```

```dart
// ===== FILE: lib/screens/record/records_screen.dart =====
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/screens/memory/memory_edit_screen.dart';
import 'package:ai_life_recorder/screens/memory/memory_list_screen.dart';
import 'package:ai_life_recorder/screens/photo/photo_timeline_screen.dart';
import 'package:ai_life_recorder/screens/photo/photo_detail_screen.dart';
import 'package:ai_life_recorder/screens/memory/memory_detail_screen.dart';

class RecordsScreen extends StatefulWidget {
  const RecordsScreen({super.key});

  @override
  State<RecordsScreen> createState() => _RecordsScreenState();
}

class _RecordsScreenState extends State<RecordsScreen> {
  int _segment = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final memoryProvider = context.read<MemoryProvider>();
      final photoProvider = context.read<PhotoProvider>();
      await memoryProvider.load();
      await photoProvider.load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('记录'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) async {
              final memoryProvider = context.read<MemoryProvider>();
              final photoProvider = context.read<PhotoProvider>();
              final navigator = Navigator.of(context);
              if (value == 'memory') {
                await navigator.push(MaterialPageRoute(
                    builder: (_) => const MemoryEditScreen()));
                if (!mounted) return;
                await memoryProvider.load();
              }
              if (value == 'photo') {
                await navigator.push(MaterialPageRoute(
                    builder: (_) => const PhotoTimelineScreen()));
                if (!mounted) return;
                await photoProvider.load();
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'memory', child: Text('写记录')),
              PopupMenuItem(value: 'photo', child: Text('拍照片')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: SegmentedButton<int>(
              segments: const [
                ButtonSegment(
                    value: 0,
                    label: Text('全部'),
                    icon: Icon(Icons.all_inclusive_rounded)),
                ButtonSegment(
                    value: 1,
                    label: Text('文字'),
                    icon: Icon(Icons.edit_note_rounded)),
                ButtonSegment(
                    value: 2,
                    label: Text('照片'),
                    icon: Icon(Icons.photo_library_rounded)),
              ],
              selected: {_segment},
              onSelectionChanged: (value) =>
                  setState(() => _segment = value.first),
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: IndexedStack(
              index: _segment,
              children: const [
                _MixedRecordsView(),
                MemoryListScreen(),
                PhotoTimelineScreen(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'records_fab',
        onPressed: () async {
          final memoryProvider = context.read<MemoryProvider>();
          final photoProvider = context.read<PhotoProvider>();
          if (_segment == 2) {
            await Navigator.push(context,
                MaterialPageRoute(builder: (_) => const PhotoTimelineScreen()));
          } else {
            await Navigator.push(context,
                MaterialPageRoute(builder: (_) => const MemoryEditScreen()));
          }
          if (!mounted) return;
          await memoryProvider.load();
          await photoProvider.load();
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
                colors: AppColors.memoryGradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight),
          ),
          child: const Icon(Icons.add_rounded, color: Colors.white),
        ),
      ),
    );
  }
}

class _MixedRecordsView extends StatelessWidget {
  const _MixedRecordsView();

  @override
  Widget build(BuildContext context) {
    final memories = context.watch<MemoryProvider>().memories;
    final photos = context.watch<PhotoProvider>().photos;
    final entries = <_RecordEntry>[
      ...memories.map(_RecordEntry.memory),
      ...photos.map(_RecordEntry.photo),
    ]..sort((a, b) => b.time.compareTo(a.time));

    if (entries.isEmpty) {
      return const Center(
          child: Text('还没有生活记录',
              style: TextStyle(fontSize: 14, color: AppColors.neutral)));
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 90),
      itemCount: entries.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final entry = entries[index];
        if (entry.type == _RecordType.memory) {
          return _MemoryRecordTile(memory: entry.memory!);
        }
        return _PhotoRecordTile(photo: entry.photo!);
      },
    );
  }
}

class _MemoryRecordTile extends StatelessWidget {
  const _MemoryRecordTile({required this.memory});
  final Memory memory;

  @override
  Widget build(BuildContext context) {
    final preview = memory.content.trim();
    final display =
        preview.length <= 90 ? preview : '${preview.substring(0, 90)}...';

    return Card(
      color: Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () async {
          await Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => MemoryDetailScreen(memory: memory)));
          if (context.mounted) await context.read<MemoryProvider>().load();
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                    color: AppColors.memoryAccent.withOpacity(0.14),
                    shape: BoxShape.circle),
                child: const Icon(Icons.edit_note_rounded,
                    color: AppColors.memoryAccent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_dateText(memory.createdAt),
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.neutral)),
                    const SizedBox(height: 5),
                    Text(display,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 14,
                            height: 1.5,
                            color: Color(0xFF3A4557))),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PhotoRecordTile extends StatelessWidget {
  const _PhotoRecordTile({required this.photo});
  final Photo photo;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () async {
          await Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => PhotoDetailScreen(photo: photo)));
          if (context.mounted) await context.read<PhotoProvider>().load();
        },
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: SizedBox(width: 84, height: 84, child: _buildImage()),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('照片',
                        style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF3A4557))),
                    if ((photo.metadata['caption'] as String?)?.isNotEmpty ??
                        false) ...[
                      const SizedBox(height: 4),
                      Text(photo.metadata['caption'] as String,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 13,
                              height: 1.4,
                              color: Color(0xFF3A4557))),
                    ],
                    if ((photo.metadata['address'] as String?)?.isNotEmpty ??
                        false) ...[
                      const SizedBox(height: 4),
                      Row(children: [
                        const Icon(Icons.place_rounded,
                            size: 13, color: AppColors.mutedIcon),
                        const SizedBox(width: 3),
                        Expanded(
                            child: Text(photo.metadata['address'] as String,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontSize: 11, color: AppColors.neutral))),
                      ]),
                    ],
                    const SizedBox(height: 6),
                    Text(_dateText(photo.takenAt),
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.neutral)),
                    if (photo.tags.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 5,
                        children: photo.tags.take(3).map((tag) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 4),
                            decoration: BoxDecoration(
                                color: AppColors.photoAccent.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(12)),
                            child: Text(tag,
                                style: const TextStyle(
                                    fontSize: 10, color: Color(0xFF9B724D))),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImage() {
    final file = File(photo.localPath);
    if (!file.existsSync()) {
      return const ColoredBox(
          color: Color(0xFFF2F3F5),
          child: Icon(Icons.broken_image_outlined, color: AppColors.neutral));
    }
    return Image.file(file, fit: BoxFit.cover);
  }
}

String _dateText(DateTime value) {
  final local = value.toLocal();
  return '${local.year}年${local.month}月${local.day}日 ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

enum _RecordType { memory, photo }

class _RecordEntry {
  const _RecordEntry._(
      {required this.type, required this.time, this.memory, this.photo});
  factory _RecordEntry.memory(Memory memory) => _RecordEntry._(
      type: _RecordType.memory, time: memory.createdAt, memory: memory);
  factory _RecordEntry.photo(Photo photo) => _RecordEntry._(
      type: _RecordType.photo, time: photo.takenAt, photo: photo);
  final _RecordType type;
  final DateTime time;
  final Memory? memory;
  final Photo? photo;
}

```

## lib/screens/home/home_screen.dart 相关区域
### 文件头 import
```dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import 'package:ai_life_recorder/constants/app_colors.dart';
import 'package:ai_life_recorder/constants/enums.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/reflection.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/providers/memory_provider.dart';
import 'package:ai_life_recorder/providers/photo_provider.dart';
import 'package:ai_life_recorder/providers/task_provider.dart';
import 'package:ai_life_recorder/repositories/reflection_repository.dart';
import 'package:ai_life_recorder/services/biometric_gate.dart';
import 'package:ai_life_recorder/screens/checkin/check_in_calendar_screen.dart';
import 'package:ai_life_recorder/screens/memory/memory_edit_screen.dart';
import 'package:ai_life_recorder/screens/photo/photo_timeline_screen.dart';
import 'package:ai_life_recorder/screens/reflection/reflection_list_screen.dart';
import 'package:ai_life_recorder/screens/settings/settings_screen.dart';

class HomeScreen extends StatefulWidget {

```
### 快捷卡区域（L255-349：含「写一条」「拍一张照片」「打卡」，需删「拍一张照片」整块）
```dart
          Text(
            date,
            style: const TextStyle(
              fontSize: 25,
              fontWeight: FontWeight.w800,
              color: Color(0xFF3A4557),
              height: 1.2,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '今天也留一点空间给自己 🌿',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF8A93A6),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 260.ms).slideY(
          begin: 0.05,
          end: 0,
        );
  }

  Widget _buildQuickCapture() {
    return Row(
      children: [
        Expanded(
          child: _quickAction(
            icon: Icons.edit_note_rounded,
            title: '写下此刻',
            subtitle: '记录一个念头',
            gradient: AppColors.memoryGradient,
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const MemoryEditScreen(),
                ),
              );

              if (mounted) {
                await context.read<MemoryProvider>().load();
              }
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _quickAction(
            icon: Icons.photo_camera_rounded,
            title: '拍一张照片',
            subtitle: '留住现在',
            gradient: AppColors.photoGradient,
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const PhotoTimelineScreen(),
                ),
              );

              if (mounted) {
                await context.read<PhotoProvider>().load();
              }
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _quickAction(
            icon: Icons.fact_check_rounded,
            title: '打卡',
            subtitle: '记录今天',
            gradient: AppColors.taskGradient,
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const CheckInCalendarScreen(),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _quickAction({
    required IconData icon,
    required String title,
    required String subtitle,
    required List<Color> gradient,

```
