// test/utils/chinese_calendar_util_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:ai_life_recorder/utils/chinese_calendar_util.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('zh_CN', null);
  });

  group('ChineseCalendarUtil 节日与农历测试', () {
    test('2026年春节命中（2026-02-17 为农历正月初一）', () {
      final info = ChineseCalendarUtil.getDayInfo(DateTime(2026, 2, 17));
      expect(info.isFestival, isTrue);
      expect(info.hasFestival('春节'), isTrue);
      expect(info.lunarDay, '初一');
      expect(info.lunarMonth, '正');
      expect(info.displayLabel, '春节');
    });

    test('2026年中秋节命中（2026-09-25 为农历八月十五）', () {
      final info = ChineseCalendarUtil.getDayInfo(DateTime(2026, 9, 25));
      expect(info.isFestival, isTrue);
      expect(info.hasFestival('中秋'), isTrue);
      expect(info.lunarDay, '十五');
      expect(info.lunarMonth, '八');
      expect(info.displayLabel, '中秋');
    });

    test('2026年清明节命中（2026-04-05 节气清明）', () {
      final info = ChineseCalendarUtil.getDayInfo(DateTime(2026, 4, 5));
      expect(info.isFestival, isTrue);
      expect(info.jieQi, '清明');
      expect(info.displayLabel, '清明');
    });

    test('2026年端午节命中（2026-06-19 为农历五月初五）', () {
      final info = ChineseCalendarUtil.getDayInfo(DateTime(2026, 6, 19));
      expect(info.isFestival, isTrue);
      expect(info.hasFestival('端午'), isTrue);
      expect(info.displayLabel, '端午');
    });

    test('公历节日命中：元旦/劳动节/国庆', () {
      final ny = ChineseCalendarUtil.getDayInfo(DateTime(2026, 1, 1));
      expect(ny.hasFestival('元旦'), isTrue);
      final ld = ChineseCalendarUtil.getDayInfo(DateTime(2026, 5, 1));
      expect(ld.hasFestival('劳动节'), isTrue);
      final nd = ChineseCalendarUtil.getDayInfo(DateTime(2026, 10, 1));
      expect(nd.hasFestival('国庆'), isTrue);
    });

    test('农历普通初一/十五（无节日）', () {
      final d1 = ChineseCalendarUtil.getDayInfo(DateTime(2026, 9, 11));
      expect(d1.lunarDay, '初一');
      expect(d1.displayLabel, '初一');
      expect(d1.isFestival, isFalse);
      final d15 =
          ChineseCalendarUtil.getDayInfo(DateTime(2026, 11, 23)); // 十月十五
      expect(d15.lunarDay, '十五');
      expect(d15.isFestival, isFalse);
    });

    test('月份标题农历月份生成', () {
      final monthStr =
          ChineseCalendarUtil.getLunarMonthString(DateTime(2026, 9));
      expect(monthStr, '农历八月');
      final title = ChineseCalendarUtil.getMonthTitle(DateTime(2026, 9));
      expect(title, contains('2026'));
      expect(title, contains('9月'));
      expect(title, contains('农历八月'));
    });
  });
}
