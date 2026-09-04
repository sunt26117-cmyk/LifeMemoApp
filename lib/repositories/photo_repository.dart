import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/photo.dart';

abstract class PhotoRepository {
  Future<void> upsert(Photo p);
  Future<void> delete(String id);
  Future<List<Photo>> listByRange(DateTime from, DateTime to);
  Future<void> confirmSummary(String id);
}

class SupabasePhotoRepository implements PhotoRepository {
  final SupabaseClient client;
  SupabasePhotoRepository(this.client);
  @override
  Future<void> upsert(Photo p) async {
    try {
      await client.from('photos').upsert(p.toJson());
    } catch (e) {
      debugPrint('Supabase photos.upsert failed: $e');
    }
  }

  @override
  Future<void> delete(String id) async {
    try {
      await client.from('photos').delete().eq('id', id);
    } catch (e) {
      debugPrint('Supabase photos.delete failed: $e');
    }
  }

  @override
  Future<List<Photo>> listByRange(DateTime from, DateTime to) async {
    try {
      final list = await client
          .from('photos')
          .select()
          .gte('taken_at', from.toUtc().toIso8601String())
          .lte('taken_at', to.toUtc().toIso8601String())
          .order('taken_at', ascending: false);
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => Photo.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase photos.listByRange failed: $e');
      return <Photo>[];
    }
  }

  @override
  Future<void> confirmSummary(String id) async {
    try {
      await client
          .from('photos')
          .update({'summary_confirmed': true}).eq('id', id);
    } catch (e) {
      debugPrint('Supabase photos.confirmSummary failed: $e');
    }
  }
}

class InMemoryPhotoRepository implements PhotoRepository {
  final List<Photo> _store = <Photo>[];
  @override
  Future<void> upsert(Photo p) async {
    _store.removeWhere((e) => e.id == p.id);
    _store.add(p);
  }

  @override
  Future<void> delete(String id) async {
    _store.removeWhere((e) => e.id == id);
  }

  @override
  Future<List<Photo>> listByRange(DateTime from, DateTime to) async {
    return _store.where((p) {
      return !p.takenAt.isBefore(from.toUtc()) &&
          !p.takenAt.isAfter(to.toUtc());
    }).toList();
  }

  @override
  Future<void> confirmSummary(String id) async {
    final idx = _store.indexWhere((e) => e.id == id);
    if (idx >= 0) {
      final p = _store[idx];
      _store[idx] = p.copyWith(summaryConfirmed: true);
    }
  }
}