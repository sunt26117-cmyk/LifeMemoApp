import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/note.dart';

/// 小记仓库（TASK-EXT-08）。
/// 保存与 AI 解耦：upsert 只写原文；AI 整理结果通过 updateAiResult 独立落库。
abstract class NoteRepository {
  Future<void> upsert(Note note);
  Future<void> delete(String id);
  Future<Note?> getById(String id);

  /// 按时间倒序；keyword 命中 title 或 content。
  Future<List<Note>> list({String? keyword, int? limit, int? offset});

  /// 只更新 AI 整理结果与状态（不影响原文）。
  Future<void> updateAiResult(
      String id, String? aiOrganized, NoteAiStatus status);
}

class SupabaseNoteRepository implements NoteRepository {
  final SupabaseClient client;
  SupabaseNoteRepository(this.client);
  @override
  Future<void> upsert(Note note) async {
    try {
      await client.from('notes').upsert(note.toJson(), onConflict: 'id');
    } catch (e) {
      debugPrint('Supabase notes.upsert failed: $e');
    }
  }

  @override
  Future<void> delete(String id) async {
    try {
      await client.from('notes').delete().eq('id', id);
    } catch (e) {
      debugPrint('Supabase notes.delete failed: $e');
    }
  }

  @override
  Future<Note?> getById(String id) async {
    try {
      final data =
          await client.from('notes').select().eq('id', id).maybeSingle();
      if (data == null) return null;
      return Note.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e) {
      debugPrint('Supabase notes.getById failed: $e');
      return null;
    }
  }

  @override
  Future<List<Note>> list({String? keyword, int? limit, int? offset}) async {
    try {
      var query = client.from('notes').select();
      if (keyword != null && keyword.trim().isNotEmpty) {
        final kw = keyword.trim();
        query = query.or('content.ilike.%$kw%,title.ilike.%$kw%');
      }
      var ordered = query.order('created_at', ascending: false);
      if (limit != null) {
        final off = offset ?? 0;
        ordered = ordered.range(off, off + limit - 1);
      }
      final list = await ordered;
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => Note.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase notes.list failed: $e');
      return <Note>[];
    }
  }

  @override
  Future<void> updateAiResult(
      String id, String? aiOrganized, NoteAiStatus status) async {
    try {
      await client.from('notes').update({
        'ai_organized': aiOrganized,
        'ai_status': status.value,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', id);
    } catch (e) {
      debugPrint('Supabase notes.updateAiResult failed: $e');
    }
  }
}

class InMemoryNoteRepository implements NoteRepository {
  final List<Note> _store = <Note>[];
  @override
  Future<void> upsert(Note note) async {
    _store.removeWhere((e) => e.id == note.id);
    _store.add(note);
  }

  @override
  Future<void> delete(String id) async {
    _store.removeWhere((e) => e.id == id);
  }

  @override
  Future<Note?> getById(String id) async {
    for (final e in _store) {
      if (e.id == id) return e;
    }
    return null;
  }

  @override
  Future<List<Note>> list({String? keyword, int? limit, int? offset}) async {
    final kw = keyword?.trim().toLowerCase() ?? '';
    var filtered = _store.where((n) {
      if (kw.isEmpty) return true;
      final inContent = n.content.toLowerCase().contains(kw);
      final inTitle = (n.title ?? '').toLowerCase().contains(kw);
      return inContent || inTitle;
    }).toList();
    filtered.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    if (limit != null || offset != null) {
      final off = offset ?? 0;
      final safeOff = off > filtered.length ? filtered.length : off;
      final end = limit != null ? safeOff + limit : filtered.length;
      final safeEnd = end > filtered.length ? filtered.length : end;
      filtered = filtered.sublist(safeOff, safeEnd);
    }
    return filtered;
  }

  @override
  Future<void> updateAiResult(
      String id, String? aiOrganized, NoteAiStatus status) async {
    final idx = _store.indexWhere((e) => e.id == id);
    if (idx >= 0) {
      _store[idx] = _store[idx].copyWith(
        aiOrganized: aiOrganized,
        aiStatus: status,
      );
    }
  }
}
