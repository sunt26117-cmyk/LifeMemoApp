import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/theme.dart';

abstract class ThemeRepository {
  Future<void> upsertByName(ThemeItem t);
  Future<List<ThemeItem>> listAll();
}

class SupabaseThemeRepository implements ThemeRepository {
  final SupabaseClient client;
  SupabaseThemeRepository(this.client);
  @override
  Future<void> upsertByName(ThemeItem t) async {
    try {
      await client.from('themes').upsert(t.toJson(), onConflict: 'theme_name');
    } catch (e) {
      debugPrint('Supabase themes.upsertByName failed: $e');
    }
  }

  @override
  Future<List<ThemeItem>> listAll() async {
    try {
      final list = await client
          .from('themes')
          .select()
          .order('updated_at', ascending: false);
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => ThemeItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase themes.listAll failed: $e');
      return <ThemeItem>[];
    }
  }
}

class InMemoryThemeRepository implements ThemeRepository {
  final List<ThemeItem> _store = <ThemeItem>[];
  @override
  Future<void> upsertByName(ThemeItem t) async {
    _store.removeWhere((e) => e.themeName == t.themeName);
    _store.add(t);
  }

  @override
  Future<List<ThemeItem>> listAll() async {
    return List<ThemeItem>.from(_store);
  }
}
