import 'package:flutter_test/flutter_test.dart';

import 'package:ai_life_recorder/models/check_in_type.dart';
import 'package:ai_life_recorder/models/check_in_record.dart';

void main() {
  group('CheckInType', () {
    final full = {
      'id': '00000000-0000-4000-8000-000000000001',
      'symbol': '📖',
      'label': '学习',
      'sort_order': 0,
      'enabled': true,
      'created_at': '2026-08-01T10:00:00.000Z',
      'updated_at': '2026-08-01T10:00:00.000Z',
    };
    test('完整字段 round-trip', () {
      final t = CheckInType.fromJson(full);
      expect(t.toJson(), full);
      expect(t.label, '学习');
      expect(t.symbol, '📖');
      expect(t.enabled, isTrue);
    });
    test('默认 5 个初始类型，顺序与符号正确', () {
      final list = CheckInType.defaults();
      expect(list.length, 5);
      expect(
          list.map((e) => e.symbol).toList(), ['📖', '🏃', '🚶', '🧘', '📚']);
      expect(list.map((e) => e.label).toList(), ['学习', '运动', '散步', '冥想', '阅读']);
      expect(list.map((e) => e.sortOrder).toList(), [0, 1, 2, 3, 4]);
      expect(list.every((e) => e.enabled), isTrue);
      // id 必须唯一，保证幂等 seed
      expect(list.map((e) => e.id).toSet().length, 5);
    });
    test('label 超过 3 个中文字符构造失败（数据层校验）', () {
      expect(CheckInType.isValidLabel('学习'), isTrue);
      expect(CheckInType.isValidLabel('学习四字'), isFalse);
      expect(CheckInType.isValidLabel('abcd'), isFalse);
      expect(CheckInType.isValidLabel(''), isFalse);
      expect(
          () => CheckInType(
                id: 'x1',
                symbol: '📖',
                label: '学习四字',
              ),
          throwsArgumentError);
    });
    test('copyWith 保留 id 与 created_at，更新 label 与 enabled', () {
      final t = CheckInType.fromJson(full);
      final t2 = t.copyWith(label: '背单词', enabled: false);
      expect(t2.id, t.id);
      expect(t2.label, '背单词');
      expect(t2.enabled, isFalse);
      expect(t2.symbol, '📖');
    });
  });

  group('CheckInRecord', () {
    final full = {
      'id': 'r1',
      'date': '2026-08-01',
      'type_id': '00000000-0000-4000-8000-000000000001',
      'task_id': null,
      'symbol_snapshot': '📖',
      'label_snapshot': '学习',
      'created_at': '2026-08-01T10:00:00.000Z',
      'updated_at': '2026-08-01T10:00:00.000Z',
    };
    test('完整字段 round-trip（date 为纯日期 key）', () {
      final r = CheckInRecord.fromJson(full);
      expect(r.toJson(), full);
      expect(CheckInRecord.dateKey(r.date), '2026-08-01');
    });
    test('create 从类型快照 symbol/label', () {
      final r = CheckInRecord.create(
        id: 'r2',
        date: DateTime(2026, 8, 1),
        typeId: 't1',
        taskId: 'task-9',
        symbol: '📚',
        label: '阅读',
      );
      expect(r.symbolSnapshot, '📚');
      expect(r.labelSnapshot, '阅读');
      expect(r.taskId, 'task-9');
    });
    test('toJson 显式输出 null 键（task_id）合法', () {
      final r = CheckInRecord.fromJson(full);
      expect(r.toJson().containsKey('task_id'), isTrue);
      expect(r.toJson()['task_id'], isNull);
    });
    test('dateKey 本地日历日拼 yyyy-MM-dd', () {
      expect(CheckInRecord.dateKey(DateTime(2026, 8, 1)), '2026-08-01');
      expect(CheckInRecord.dateKey(DateTime(2026, 12, 31)), '2026-12-31');
    });
    test('copyWith', () {
      final r = CheckInRecord.fromJson(full);
      final r2 = r.copyWith(labelSnapshot: '改后名称');
      expect(r2.labelSnapshot, '改后名称');
      expect(r2.id, 'r1');
    });
  });
}
