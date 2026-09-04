import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/check_in_type.dart';

/// 打卡类型仓库（TASK-EXT-01）。
/// 关键约束：类型不允许物理删除，只能 编辑(symbol/label/sortOrder)/停用(enabled=false)/启用。
/// 停用后：历史打卡记录通过 symbolSnapshot/labelSnapshot 仍可正常展示（见 CheckInRecord）。
abstract class CheckInTypeRepository {
  /// 初始化系统默认 5 类型（幂等：已存在同 id 则跳过）。
  Future<void> seedDefaults();
  Future<CheckInType?> getById(String id);

  /// 全部类型（含停用），按 sortOrder 升序。
  Future<List<CheckInType>> listAll();

  /// 仅启用的类型（打卡选择面板 / 任务关联用）。
  Future<List<CheckInType>> listEnabled();

  /// 新建或保存编辑后的类型（覆盖式）。
  Future<void> save(CheckInType type);

  /// 停用/启用切换。
  Future<void> setEnabled(String id, bool enabled);
}

class SupabaseCheckInTypeRepository implements CheckInTypeRepository {
  final SupabaseClient client;
  SupabaseCheckInTypeRepository(this.client);

  @override
  Future<void> seedDefaults() async {
    try {
      for (final t in CheckInType.defaults()) {
        await client
            .from('check_in_types')
            .upsert(t.toJson(), onConflict: 'id');
      }
    } catch (e) {
      debugPrint('Supabase check_in_types.seedDefaults failed: $e');
    }
  }

  @override
  Future<CheckInType?> getById(String id) async {
    try {
      final data = await client
          .from('check_in_types')
          .select()
          .eq('id', id)
          .maybeSingle();
      if (data == null) return null;
      return CheckInType.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e) {
      debugPrint('Supabase check_in_types.getById failed: $e');
      return null;
    }
  }

  Future<List<CheckInType>> _query({bool? enabledOnly}) async {
    try {
      var q = client.from('check_in_types').select();
      if (enabledOnly == true) q = q.eq('enabled', true);
      final list = await q.order('sort_order', ascending: true);
      final arr = (list as List<dynamic>?) ?? <dynamic>[];
      return arr
          .map((e) => CheckInType.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (e) {
      debugPrint('Supabase check_in_types.list failed: $e');
      return <CheckInType>[];
    }
  }

  @override
  Future<List<CheckInType>> listAll() => _query();

  @override
  Future<List<CheckInType>> listEnabled() => _query(enabledOnly: true);

  @override
  Future<void> save(CheckInType type) async {
    try {
      await client
          .from('check_in_types')
          .upsert(type.toJson(), onConflict: 'id');
    } catch (e) {
      debugPrint('Supabase check_in_types.save failed: $e');
    }
  }

  @override
  Future<void> setEnabled(String id, bool enabled) async {
    try {
      await client.from('check_in_types').update({
        'enabled': enabled,
        'updated_at': DateTime.now().toUtc().toIso8601String()
      }).eq('id', id);
    } catch (e) {
      debugPrint('Supabase check_in_types.setEnabled failed: $e');
    }
  }
}

class InMemoryCheckInTypeRepository implements CheckInTypeRepository {
  final List<CheckInType> _store = <CheckInType>[];

  @override
  Future<void> seedDefaults() async {
    for (final t in CheckInType.defaults()) {
      final exists = _store.any((e) => e.id == t.id);
      if (!exists) _store.add(t);
    }
    _sort();
  }

  @override
  Future<CheckInType?> getById(String id) async {
    for (final e in _store) {
      if (e.id == id) return e;
    }
    return null;
  }

  @override
  Future<List<CheckInType>> listAll() async {
    _sort();
    return List<CheckInType>.from(_store);
  }

  @override
  Future<List<CheckInType>> listEnabled() async {
    _sort();
    return _store.where((e) => e.enabled).toList();
  }

  @override
  Future<void> save(CheckInType type) async {
    final idx = _store.indexWhere((e) => e.id == type.id);
    if (idx >= 0) {
      _store[idx] = type;
    } else {
      _store.add(type);
    }
    _sort();
  }

  @override
  Future<void> setEnabled(String id, bool enabled) async {
    final idx = _store.indexWhere((e) => e.id == id);
    if (idx >= 0) {
      _store[idx] = _store[idx].copyWith(enabled: enabled);
    }
  }

  void _sort() {
    _store.sort((a, b) {
      final c = a.sortOrder.compareTo(b.sortOrder);
      return c != 0 ? c : a.createdAt.compareTo(b.createdAt);
    });
  }
}
