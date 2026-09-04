import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/trend.dart';

abstract class TrendRepository {
  Future<void> upsertByName(Trend t);
  Future<List<Trend>> listAll();
}

class SupabaseTrendRepository implements TrendRepository {
  final SupabaseClient client;
  SupabaseTrendRepository(this.client);
  @override
  Future<void> upsertByName(Trend t) async {
    try {
      await client.from('trends').upsert(t.toJson(), onConflict: 'trend_name');
    } catch (e) {
      debugPrint('Supabase trends.upsertByName failed: $e');
    }
  }

  @override
  Future<List<Trend>> listAll() async {
    try {
      final list = await client
          .from('trends')
          .select()
          .order('updated_at', ascending: false);
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => Trend.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase trends.listAll failed: $e');
      return <Trend>[];
    }
  }
}

class InMemoryTrendRepository implements TrendRepository {
  final List<Trend> _store = <Trend>[];
  @override
  Future<void> upsertByName(Trend t) async {
    _store.removeWhere((e) => e.trendName == t.trendName);
    _store.add(t);
  }

  @override
  Future<List<Trend>> listAll() async {
    return List<Trend>.from(_store);
  }
}
