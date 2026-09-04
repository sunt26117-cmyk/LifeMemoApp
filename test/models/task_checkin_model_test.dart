import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/constants/enums.dart';

void main() {
  group('Task checkInTypeIds 序列化（TASK-EXT-04）', () {
    Task make() => Task(
          id: 't1',
          title: '任务',
          category: TaskCategory.learning,
          priority: TaskPriority.medium,
          repeatRule: RepeatRule.none,
          status: TaskStatus.todo,
          checkInTypeIds: const ['a1', 'b2'],
        );

    test('toJson 输出 check_in_type_ids', () {
      final json = make().toJson();
      expect(json['check_in_type_ids'], isA<List>());
      expect((json['check_in_type_ids'] as List), ['a1', 'b2']);
    });

    test('fromJson 恢复 check_in_type_ids', () {
      final t = Task.fromJson(make().toJson());
      expect(t.checkInTypeIds, ['a1', 'b2']);
    });

    test('缺省 check_in_type_ids 时为 []（兼容旧数据）', () {
      final json = make().toJson()..remove('check_in_type_ids');
      final t = Task.fromJson(json);
      expect(t.checkInTypeIds, isEmpty);
    });

    test('copyWith 可替换/保留 checkInTypeIds', () {
      final t = make();
      expect(t.copyWith().checkInTypeIds, ['a1', 'b2']);
      expect(t.copyWith(checkInTypeIds: const ['c3']).checkInTypeIds, ['c3']);
    });
  });
}