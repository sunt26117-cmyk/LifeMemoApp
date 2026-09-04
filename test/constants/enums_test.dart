import 'package:flutter_test/flutter_test.dart';

import 'package:ai_life_recorder/constants/enums.dart';

void main() {
  group('TaskCategory', () {
    test('valuesList 齐全', () {
      expect(
          TaskCategory.valuesList, ['沟通', '学习', '健康', '项目', '情绪', '习惯', '规划']);
    });
    test('fromString 正确解析', () {
      expect(TaskCategory.fromString('沟通'), TaskCategory.communication);
      expect(TaskCategory.fromString('规划'), TaskCategory.planning);
    });
    test('未知值抛 FormatException', () {
      expect(() => TaskCategory.fromString('不存在'), throwsFormatException);
    });
  });

  group('TaskStatus', () {
    test('valuesList 齐全', () {
      expect(TaskStatus.valuesList, ['未开始', '进行中', '已完成', '延期', '取消']);
    });
    test('fromString 正确解析', () {
      expect(TaskStatus.fromString('未开始'), TaskStatus.todo);
      expect(TaskStatus.fromString('已完成'), TaskStatus.done);
    });
    test('未知值抛 FormatException', () {
      expect(() => TaskStatus.fromString('xx'), throwsFormatException);
    });
  });

  group('TaskPriority', () {
    test('valuesList 齐全', () {
      expect(TaskPriority.valuesList, ['高', '中', '低']);
    });
    test('fromString 正确解析', () {
      expect(TaskPriority.fromString('高'), TaskPriority.high);
      expect(TaskPriority.fromString('低'), TaskPriority.low);
    });
    test('未知值抛 FormatException', () {
      expect(() => TaskPriority.fromString('超高'), throwsFormatException);
    });
  });

  group('RepeatRule', () {
    test('valuesList 齐全', () {
      expect(RepeatRule.valuesList, ['无', '每天', '每周', '每月', '自定义']);
    });
    test('fromString 正确解析', () {
      expect(RepeatRule.fromString('每天'), RepeatRule.daily);
      expect(RepeatRule.fromString('自定义'), RepeatRule.custom);
    });
    test('未知值抛 FormatException', () {
      expect(() => RepeatRule.fromString('每两年'), throwsFormatException);
    });
  });

  group('Emotion', () {
    test('valuesList 齐全', () {
      expect(Emotion.valuesList, [
        '平静',
        '开心',
        '紧张',
        '焦虑',
        '愤怒',
        '难过',
        '疲惫',
        '兴奋',
        '满足',
        '其他',
      ]);
    });
    test('fromString 正确解析', () {
      expect(Emotion.fromString('平静'), Emotion.calm);
      expect(Emotion.fromString('其他'), Emotion.other);
    });
    test('未知值抛 FormatException', () {
      expect(() => Emotion.fromString('迷茫'), throwsFormatException);
    });
  });

  group('ThemeDirection / TrendDirection', () {
    test('valuesList 齐全', () {
      expect(ThemeDirection.valuesList, ['改善', '稳定', '恶化']);
      expect(TrendDirection.valuesList, ['改善', '稳定', '恶化']);
    });
    test('fromString 正确解析', () {
      expect(ThemeDirection.fromString('改善'), ThemeDirection.improving);
      expect(TrendDirection.fromString('恶化'), TrendDirection.worsening);
    });
    test('未知值抛 FormatException', () {
      expect(() => ThemeDirection.fromString('不明'), throwsFormatException);
    });
  });

  group('SummaryType', () {
    test('valuesList 齐全', () {
      expect(SummaryType.valuesList, ['周', '月', '年']);
    });
    test('fromString 正确解析', () {
      expect(SummaryType.fromString('周'), SummaryType.weekly);
      expect(SummaryType.fromString('年'), SummaryType.yearly);
    });
    test('未知值抛 FormatException', () {
      expect(() => SummaryType.fromString('季'), throwsFormatException);
    });
  });

  group('DelayType', () {
    test('valuesList 齐全', () {
      expect(DelayType.valuesList, ['外部', '内部', '逃避']);
    });
    test('fromString 正确解析', () {
      expect(DelayType.fromString('外部'), DelayType.external);
      expect(DelayType.fromString('逃避'), DelayType.avoidance);
    });
    test('未知值抛 FormatException', () {
      expect(() => DelayType.fromString('忘记'), throwsFormatException);
    });
  });

  group('CancelType', () {
    test('valuesList 齐全', () {
      expect(CancelType.valuesList, ['主动', '被动', '逃避']);
    });
    test('fromString 正确解析', () {
      expect(CancelType.fromString('主动'), CancelType.active);
      expect(CancelType.fromString('被动'), CancelType.passive);
    });
    test('未知值抛 FormatException', () {
      expect(() => CancelType.fromString('放弃'), throwsFormatException);
    });
  });
}
