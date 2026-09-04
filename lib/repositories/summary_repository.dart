import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/summary.dart';
import '../constants/enums.dart';

abstract class SummaryRepository {
  Future<void> upsert(Summary s);
  Future<void> delete(String id);
  Future<Summary?> getByPeriod(SummaryType type, DateTime periodStart);
  Future<List<Summary>> listAll();
}

class SupabaseSummaryRepository implements SummaryRepository {
  final SupabaseClient client;
  SupabaseSummaryRepository(this.client);
  @override
  Future<void> upsert(Summary s) async {
    try {
      final map = s.toJson();
      // period_start/period_end 是 date 列：存纯日期，保证与 getByPeriod 的 key 一致
      map['period_start'] = _dateKey(s.periodStart);
      map['period_end'] = _dateKey(s.periodEnd);
      await client.from('summaries').upsert(map);
    } catch (e) {
      debugPrint('Supabase summaries.upsert failed: $e');
    }
  }

  /// 纯 UTC 日期 key（yyyy-MM-dd），date 列读写统一用这个
  static String _dateKey(DateTime dt) {
    final utc = dt.toUtc();
    final y = utc.year.toString().padLeft(4, '0');
    final m = utc.month.toString().padLeft(2, '0');
    final d = utc.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  @override
  Future<void> delete(String id) async {
    try {
      await client.from('summaries').delete().eq('id', id);
    } catch (e) {
      debugPrint('Supabase summaries.delete failed: $e');
    }
  }

  @override
  Future<Summary?> getByPeriod(SummaryType type, DateTime periodStart) async {
    try {
      final data = await client
          .from('summaries')
          .select()
          .eq('type', type.value)
          .eq('period_start', _dateKey(periodStart))
          .maybeSingle();
      if (data == null) return null;
      return Summary.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e) {
      debugPrint('Supabase summaries.getByPeriod failed: $e');
      return null;
    }
  }

  @override
  Future<List<Summary>> listAll() async {
    try {
      final list = await client
          .from('summaries')
          .select()
          .order('created_at', ascending: false);
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => Summary.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase summaries.listAll failed: $e');
      return <Summary>[];
    }
  }
}

class InMemorySummaryRepository implements SummaryRepository {
  final List<Summary> _store = <Summary>[];
  @override
  Future<void> upsert(Summary s) async {
    _store.removeWhere((e) => e.id == s.id);
    _store.add(s);
  }

  @override
  Future<void> delete(String id) async {
    _store.removeWhere((e) => e.id == id);
  }

  @override
  Future<Summary?> getByPeriod(SummaryType type, DateTime periodStart) async {
    final key = _dateKey(periodStart);
    for (final s in _store) {
      if (s.type == type && _dateKey(s.periodStart) == key) {
        return s;
      }
    }
    return null;
  }

  static String _dateKey(DateTime dt) {
    final utc = dt.toUtc();
    final y = utc.year.toString().padLeft(4, '0');
    final m = utc.month.toString().padLeft(2, '0');
    final d = utc.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  @override
  Future<List<Summary>> listAll() async {
    return List<Summary>.from(_store);
  }
}