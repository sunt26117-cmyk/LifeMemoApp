import 'dart:async';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/check_in_record.dart';

/// 打卡记录仓库（TASK-EXT-01）。
/// 覆盖式约束：同一天(date)同一类型(typeId)只保留一条最终记录——
/// 二次写入覆盖而非新增行（EXT-03 的覆盖式提交在数据层由此保证）。
/// 记录保存 symbolSnapshot/labelSnapshot，类型停用/改名不影响历史查询展示。
abstract class CheckInRecordRepository {
  /// 覆盖式保存：按 (date, type_id) upsert。
  Future<void> upsert(CheckInRecord record);
  Future<CheckInRecord?> getByDateAndType(DateTime date, String typeId);
  Future<List<CheckInRecord>> listByDate(DateTime date);

  /// 闭区间 [from, to]（本地日历日），按 date 升序。
  Future<List<CheckInRecord>> listByRange(DateTime from, DateTime to);

  /// 某类型的历史全部记录（含停用类型的快照记录），按 date 倒序。
  Future<List<CheckInRecord>> listByType(String typeId);

  /// 删除某天的某条打卡（清空/取消打卡用，删除记录 ≠ 删除类型）。
  Future<void> deleteByDateAndType(DateTime date, String typeId);
}

class SupabaseCheckInRecordRepository implements CheckInRecordRepository {
  final SupabaseClient client;
  SupabaseCheckInRecordRepository(this.client);

  @override
  Future<void> upsert(CheckInRecord record) async {
    try {
      await client
          .from('check_in_records')
          .upsert(record.toJson(), onConflict: 'date,type_id');
    } catch (e) {
      debugPrint('Supabase check_in_records.upsert failed: $e');
    }
  }

  @override
  Future<CheckInRecord?> getByDateAndType(DateTime date, String typeId) async {
    try {
      final data = await client
          .from('check_in_records')
          .select()
          .eq('date', CheckInRecord.dateKey(date))
          .eq('type_id', typeId)
          .maybeSingle();
      if (data == null) return null;
      return CheckInRecord.fromJson(Map<String, dynamic>.from(data as Map));
    } catch (e) {
      debugPrint('Supabase check_in_records.getByDateAndType failed: $e');
      return null;
    }
  }

  @override
  Future<List<CheckInRecord>> listByDate(DateTime date) async {
    try {
      final list = await client
          .from('check_in_records')
          .select()
          .eq('date', CheckInRecord.dateKey(date))
          .order('created_at', ascending: true);
      return _toList(list);
    } catch (e) {
      debugPrint('Supabase check_in_records.listByDate failed: $e');
      return <CheckInRecord>[];
    }
  }

  @override
  Future<List<CheckInRecord>> listByRange(DateTime from, DateTime to) async {
    try {
      final list = await client
          .from('check_in_records')
          .select()
          .gte('date', CheckInRecord.dateKey(from))
          .lte('date', CheckInRecord.dateKey(to))
          .order('date', ascending: true);
      return _toList(list);
    } catch (e) {
      debugPrint('Supabase check_in_records.listByRange failed: $e');
      return <CheckInRecord>[];
    }
  }

  @override
  Future<List<CheckInRecord>> listByType(String typeId) async {
    try {
      final list = await client
          .from('check_in_records')
          .select()
          .eq('type_id', typeId)
          .order('date', ascending: false);
      return _toList(list);
    } catch (e) {
      debugPrint('Supabase check_in_records.listByType failed: $e');
      return <CheckInRecord>[];
    }
  }

  @override
  Future<void> deleteByDateAndType(DateTime date, String typeId) async {
    try {
      await client
          .from('check_in_records')
          .delete()
          .eq('date', CheckInRecord.dateKey(date))
          .eq('type_id', typeId);
    } catch (e) {
      debugPrint('Supabase check_in_records.deleteByDateAndType failed: $e');
    }
  }

  List<CheckInRecord> _toList(dynamic list) {
    final arr = (list as List<dynamic>?) ?? <dynamic>[];
    return arr
        .map((e) => CheckInRecord.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }
}

class InMemoryCheckInRecordRepository implements CheckInRecordRepository {
  final List<CheckInRecord> _store = <CheckInRecord>[];

  @override
  Future<void> upsert(CheckInRecord record) async {
    // 覆盖式：同 (date, type_id) 只保留最新一条
    _store.removeWhere((e) =>
        CheckInRecord.dateKey(e.date) == CheckInRecord.dateKey(record.date) &&
        e.typeId == record.typeId);
    _store.add(record);
  }

  @override
  Future<CheckInRecord?> getByDateAndType(DateTime date, String typeId) async {
    final key = CheckInRecord.dateKey(date);
    for (final e in _store) {
      if (CheckInRecord.dateKey(e.date) == key && e.typeId == typeId) return e;
    }
    return null;
  }

  @override
  Future<List<CheckInRecord>> listByDate(DateTime date) async {
    final key = CheckInRecord.dateKey(date);
    final res =
        _store.where((e) => CheckInRecord.dateKey(e.date) == key).toList();
    res.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return res;
  }

  @override
  Future<List<CheckInRecord>> listByRange(DateTime from, DateTime to) async {
    final fk = CheckInRecord.dateKey(from);
    final tk = CheckInRecord.dateKey(to);
    final res = _store.where((e) {
      final k = CheckInRecord.dateKey(e.date);
      return k.compareTo(fk) >= 0 && k.compareTo(tk) <= 0;
    }).toList();
    res.sort((a, b) => a.date.compareTo(b.date));
    return res;
  }

  @override
  Future<List<CheckInRecord>> listByType(String typeId) async {
    final res = _store.where((e) => e.typeId == typeId).toList();
    res.sort((a, b) => b.date.compareTo(a.date));
    return res;
  }

  @override
  Future<void> deleteByDateAndType(DateTime date, String typeId) async {
    final key = CheckInRecord.dateKey(date);
    _store.removeWhere(
        (e) => CheckInRecord.dateKey(e.date) == key && e.typeId == typeId);
  }
}
