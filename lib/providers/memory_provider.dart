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
    List<String>? relatedMediaIds,
    Map<String, dynamic>? metadata,
  }) async {
    final now = DateTime.now().toUtc();
    final memId = id ?? const Uuid().v4();
    final memory = Memory(
      id: memId,
      title: title,
      content: content,
      tags: List<String>.from(tags),
      aiSummary: null,
      relatedMediaIds: relatedMediaIds != null
          ? List<String>.from(relatedMediaIds)
          : const [],
      metadata: metadata ?? const <String, dynamic>{},
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

  /// 手动重新生成摘要：失败后重试，或成功后想再生成一次都可用（generating 中除外）。
  Future<void> retrySummary(String id) async {
    final status = _summaryStatuses[id] ?? MemorySummaryStatus.none;
    if (status == MemorySummaryStatus.generating) return;
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
