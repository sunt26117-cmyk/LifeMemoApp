import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/memory.dart';

abstract class MemoryRepository {
  Future<void> upsert(Memory m);
  Future<void> delete(String id);
  Future<Memory?> getById(String id);
  Future<List<Memory>> list(
      {List<String>? tags,
      String? keyword,
      DateTime? from,
      DateTime? to,
      int? limit,
      int? offset});
  Future<void> updateSummary(String id, String aiSummary);
}

class SupabaseMemoryRepository implements MemoryRepository {
  final SupabaseClient client;
  SupabaseMemoryRepository(this.client);
  @override
  Future<void> upsert(Memory m) async {
    final map = m.toJson();
    try {
      await client.from('memories').upsert(map);
    } catch (e) {
      debugPrint('Supabase memories.upsert failed: $e');
    }
  }

  @override
  Future<void> delete(String id) async {
    try {
      await client.from('memories').delete().eq('id', id);
    } catch (e) {
      debugPrint('Supabase memories.delete failed: $e');
    }
  }

  @override
  Future<Memory?> getById(String id) async {
    try {
      final data =
          await client.from('memories').select().eq('id', id).maybeSingle();
      if (data == null) return null;
      return Memory.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e) {
      debugPrint('Supabase memories.getById failed: $e');
      return null;
    }
  }

  @override
  Future<List<Memory>> list(
      {List<String>? tags,
      String? keyword,
      DateTime? from,
      DateTime? to,
      int? limit,
      int? offset}) async {
    try {
      var query = client.from('memories').select();
      if (keyword != null && keyword.isNotEmpty) {
        query =
            query.ilike('content', '%$keyword%').or('title.ilike.%$keyword%');
      }
      if (from != null) {
        query = query.gte('created_at', from.toUtc().toIso8601String());
      }
      if (to != null) {
        query = query.lte('created_at', to.toUtc().toIso8601String());
      }
      if (tags != null && tags.isNotEmpty) query = query.contains('tags', tags);
      var ordered = query.order('created_at', ascending: false);
      if (limit != null) {
        final off = offset ?? 0;
        ordered = ordered.range(off, off + limit - 1);
      }
      final list = await ordered;
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => Memory.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase memories.list failed: $e');
      return <Memory>[];
    }
  }

  @override
  Future<void> updateSummary(String id, String aiSummary) async {
    try {
      await client
          .from('memories')
          .update({'ai_summary': aiSummary}).eq('id', id);
    } catch (e) {
      debugPrint('Supabase memories.updateSummary failed: $e');
    }
  }
}

class InMemoryMemoryRepository implements MemoryRepository {
  final List<Memory> _store = <Memory>[];
  @override
  Future<void> upsert(Memory m) async {
    _store.removeWhere((e) => e.id == m.id);
    _store.add(m);
  }

  @override
  Future<void> delete(String id) async {
    _store.removeWhere((e) => e.id == id);
  }

  @override
  Future<Memory?> getById(String id) async {
    for (final e in _store) {
      if (e.id == id) return e;
    }
    return null;
  }

  @override
  Future<List<Memory>> list(
      {List<String>? tags,
      String? keyword,
      DateTime? from,
      DateTime? to,
      int? limit,
      int? offset}) async {
    final kw = keyword?.toLowerCase();
    var filtered = _store.where((m) {
      if (tags != null && tags.isNotEmpty) {
        final hit = m.tags.any((t) => tags.contains(t));
        if (!hit) return false;
      }
      if (kw != null && kw.isNotEmpty) {
        final inContent = m.content.toLowerCase().contains(kw);
        final inTitle = (m.title ?? '').toLowerCase().contains(kw);
        if (!inContent && !inTitle) return false;
      }
      if (from != null && m.createdAt.isBefore(from.toUtc())) return false;
      if (to != null && m.createdAt.isAfter(to.toUtc())) return false;
      return true;
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
  Future<void> updateSummary(String id, String aiSummary) async {
    final idx = _store.indexWhere((e) => e.id == id);
    if (idx >= 0) {
      final m = _store[idx];
      _store[idx] = m.copyWith(aiSummary: aiSummary);
    }
  }
}