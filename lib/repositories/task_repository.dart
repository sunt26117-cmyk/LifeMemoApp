import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/task.dart';
import '../constants/enums.dart';

abstract class TaskRepository {
  Future<void> upsert(Task t);
  Future<void> delete(String id);
  Future<Task?> getById(String id);
  Future<List<Task>> listByStatus(TaskStatus? status);
  Future<List<Task>> listByCategory(TaskCategory? category);
  Future<void> updateFeedback(String id, TaskFeedback feedback);
  Future<List<Task>> list({DateTime? from, DateTime? to});
}

class SupabaseTaskRepository implements TaskRepository {
  final SupabaseClient client;
  SupabaseTaskRepository(this.client);
  @override
  Future<void> upsert(Task t) async {
    try {
      await client.from('tasks').upsert(t.toJson());
    } catch (e) {
      debugPrint('Supabase tasks.upsert failed: $e');
    }
  }

  @override
  Future<void> delete(String id) async {
    try {
      await client.from('tasks').delete().eq('id', id);
    } catch (e) {
      debugPrint('Supabase tasks.delete failed: $e');
    }
  }

  @override
  Future<Task?> getById(String id) async {
    try {
      final data =
          await client.from('tasks').select().eq('id', id).maybeSingle();
      if (data == null) return null;
      return Task.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e) {
      debugPrint('Supabase tasks.getById failed: $e');
      return null;
    }
  }

  @override
  Future<List<Task>> listByStatus(TaskStatus? status) async {
    try {
      var q = client.from('tasks').select();
      if (status != null) q = q.eq('status', status.value);
      final list = await q.order('created_at', ascending: false);
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => Task.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase tasks.listByStatus failed: $e');
      return <Task>[];
    }
  }

  @override
  Future<List<Task>> listByCategory(TaskCategory? category) async {
    try {
      var q = client.from('tasks').select();
      if (category != null) q = q.eq('category', category.value);
      final list = await q.order('created_at', ascending: false);
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => Task.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase tasks.listByCategory failed: $e');
      return <Task>[];
    }
  }

  @override
  Future<void> updateFeedback(String id, TaskFeedback feedback) async {
    try {
      await client
          .from('tasks')
          .update({'feedback': feedback.toJson()}).eq('id', id);
    } catch (e) {
      debugPrint('Supabase tasks.updateFeedback failed: $e');
    }
  }

  @override
  Future<List<Task>> list({DateTime? from, DateTime? to}) async {
    try {
      var q = client.from('tasks').select();
      if (from != null) q = q.gte('created_at', from.toUtc().toIso8601String());
      if (to != null) q = q.lte('created_at', to.toUtc().toIso8601String());
      final list = await q.order('created_at', ascending: false);
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => Task.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase tasks.list failed: $e');
      return <Task>[];
    }
  }
}

class InMemoryTaskRepository implements TaskRepository {
  final List<Task> _store = <Task>[];
  @override
  Future<void> upsert(Task t) async {
    _store.removeWhere((e) => e.id == t.id);
    _store.add(t);
  }

  @override
  Future<void> delete(String id) async {
    _store.removeWhere((e) => e.id == id);
  }

  @override
  Future<Task?> getById(String id) async {
    for (final e in _store) {
      if (e.id == id) return e;
    }
    return null;
  }

  @override
  Future<List<Task>> listByStatus(TaskStatus? status) async {
    return _store
        .where((t) => status == null ? true : t.status == status)
        .toList();
  }

  @override
  Future<List<Task>> listByCategory(TaskCategory? category) async {
    return _store
        .where((t) => category == null ? true : t.category == category)
        .toList();
  }

  @override
  Future<void> updateFeedback(String id, TaskFeedback feedback) async {
    final idx = _store.indexWhere((e) => e.id == id);
    if (idx >= 0) {
      final t = _store[idx];
      _store[idx] = t.copyWith(feedback: feedback);
    }
  }

  @override
  Future<List<Task>> list({DateTime? from, DateTime? to}) async {
    return _store.where((t) {
      if (from != null && t.createdAt.isBefore(from.toUtc())) return false;
      if (to != null && t.createdAt.isAfter(to.toUtc())) return false;
      return true;
    }).toList();
  }
}