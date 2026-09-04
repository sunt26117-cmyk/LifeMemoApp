import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/reflection.dart';

abstract class ReflectionRepository {
  Future<void> upsert(Reflection r);
  Future<void> delete(String id);
  Future<Reflection?> getById(String id);
  Future<List<Reflection>> list({DateTime? from, DateTime? to});
}

class SupabaseReflectionRepository implements ReflectionRepository {
  final SupabaseClient client;
  SupabaseReflectionRepository(this.client);
  @override
  Future<void> upsert(Reflection r) async {
    try {
      await client.from('reflections').upsert(r.toJson());
    } catch (e) {
      debugPrint('Supabase reflections.upsert failed: $e');
    }
  }

  @override
  Future<void> delete(String id) async {
    try {
      await client.from('reflections').delete().eq('id', id);
    } catch (e) {
      debugPrint('Supabase reflections.delete failed: $e');
    }
  }

  @override
  Future<Reflection?> getById(String id) async {
    try {
      final data =
          await client.from('reflections').select().eq('id', id).maybeSingle();
      if (data == null) return null;
      return Reflection.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e) {
      debugPrint('Supabase reflections.getById failed: $e');
      return null;
    }
  }

  @override
  Future<List<Reflection>> list({DateTime? from, DateTime? to}) async {
    try {
      var q = client.from('reflections').select();
      if (from != null) q = q.gte('created_at', from.toUtc().toIso8601String());
      if (to != null) q = q.lte('created_at', to.toUtc().toIso8601String());
      final list = await q.order('created_at', ascending: false);
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => Reflection.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase reflections.list failed: $e');
      return <Reflection>[];
    }
  }
}

class InMemoryReflectionRepository implements ReflectionRepository {
  final List<Reflection> _store = <Reflection>[];
  @override
  Future<void> upsert(Reflection r) async {
    _store.removeWhere((e) => e.id == r.id);
    _store.add(r);
  }

  @override
  Future<void> delete(String id) async {
    _store.removeWhere((e) => e.id == id);
  }

  @override
  Future<Reflection?> getById(String id) async {
    for (final e in _store) {
      if (e.id == id) return e;
    }
    return null;
  }

  @override
  Future<List<Reflection>> list({DateTime? from, DateTime? to}) async {
    return _store.where((r) {
      if (from != null && r.createdAt.isBefore(from.toUtc())) return false;
      if (to != null && r.createdAt.isAfter(to.toUtc())) return false;
      return true;
    }).toList();
  }
}