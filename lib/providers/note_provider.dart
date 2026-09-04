import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import 'package:ai_life_recorder/models/note.dart';
import 'package:ai_life_recorder/repositories/note_repository.dart';
import 'package:ai_life_recorder/ai/note_ai.dart';
import 'package:ai_life_recorder/utils/fuzzy_search.dart';

/// 小记 Provider（TASK-EXT-08）。
/// 保存（save）与 AI 完全解耦：save 只写原文并立刻成功返回；
/// AI 整理是可选异步操作（organize 系列），失败只把状态标 failed，绝不动原文。
class NoteProvider extends ChangeNotifier {
  final NoteRepository repository;
  final NoteAi? noteAi; // 可为 null（AI 未配置时小记照常可用）
  NoteProvider({required this.repository, this.noteAi});

  final List<Note> _notes = <Note>[];
  String _keyword = '';
  bool _loaded = false;

  List<Note> get notes {
    final kw = _keyword.trim();
    if (kw.isEmpty) return List<Note>.unmodifiable(_notes);
    // TASK-EXT-11：模糊 OR 搜索（任一关键词命中即可）
    return _notes.where((n) {
      return fuzzyMatches(
        title: n.title ?? '',
        content: n.content,
        tags: const <String>[],
        query: kw,
      );
    }).toList(growable: false);
  }

  bool get loaded => _loaded;

  Future<void> load() async {
    try {
      final items = await repository.list();
      _notes
        ..clear()
        ..addAll(items);
      _notes.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      _loaded = true;
      notifyListeners();
    } catch (e) {
      debugPrint('NoteProvider.load error: $e');
    }
  }

  /// 保存小记（新建或更新）。只写原文与标题，返回保存后的 Note。
  Future<Note?> save({
    String? id,
    String? title,
    required String content,
    bool clearTitle = false,
  }) async {
    final trimmed = content.trim();
    if (trimmed.isEmpty) return null;
    final now = DateTime.now().toUtc();
    final noteId = id ?? const Uuid().v4();
    Note? existing;
    if (id != null) {
      for (final n in _notes) {
        if (n.id == id) {
          existing = n;
          break;
        }
      }
    }
    final baseTitle = clearTitle ? null : (title ?? existing?.title);
    final note = Note(
      id: noteId,
      title: baseTitle,
      content: trimmed,
      aiOrganized: existing?.aiOrganized,
      aiStatus: existing?.aiStatus ?? NoteAiStatus.none,
      createdAt: existing?.createdAt ?? now,
    );
    try {
      await repository.upsert(note);
      final idx = _notes.indexWhere((n) => n.id == noteId);
      if (idx >= 0) {
        _notes[idx] = note;
      } else {
        _notes.add(note);
      }
      _notes.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      notifyListeners();
      return note;
    } catch (e) {
      debugPrint('NoteProvider.save error: $e');
      return null;
    }
  }

  /// 触发 AI 整理（保存后手动点按钮，或编辑页保存时可选自动）。
  /// AI 失败/未配置：仅状态标 failed/none，原文不受影响。
  Future<void> organize(String id) async {
    final idx = _notes.indexWhere((n) => n.id == id);
    if (idx < 0) return;
    final note = _notes[idx];
    if (noteAi == null) {
      _setStatus(id, NoteAiStatus.failed);
      return;
    }
    _setStatus(id, NoteAiStatus.generating);
    String? organized;
    var nextStatus = NoteAiStatus.failed;
    try {
      organized = await noteAi!.organize(
        content: note.content,
        title: note.title,
      );
      nextStatus = NoteAiStatus.success;
    } catch (e) {
      debugPrint('NoteProvider.organize failed: $e');
    }
    try {
      await repository.updateAiResult(id, organized, nextStatus);
    } catch (e) {
      debugPrint('NoteProvider.organize persist failed: $e');
    }
    final i2 = _notes.indexWhere((n) => n.id == id);
    if (i2 >= 0) {
      _notes[i2] = _notes[i2].copyWith(
        aiOrganized: organized,
        aiStatus: nextStatus,
      );
    }
    notifyListeners();
  }

  Future<void> delete(String id) async {
    try {
      await repository.delete(id);
      _notes.removeWhere((n) => n.id == id);
      notifyListeners();
    } catch (e) {
      debugPrint('NoteProvider.delete error: $e');
    }
  }

  void setKeyword(String kw) {
    _keyword = kw;
    notifyListeners();
  }

  void _setStatus(String id, NoteAiStatus status) {
    final idx = _notes.indexWhere((n) => n.id == id);
    if (idx >= 0) {
      _notes[idx] = _notes[idx].copyWith(aiStatus: status);
      notifyListeners();
    }
  }
}
