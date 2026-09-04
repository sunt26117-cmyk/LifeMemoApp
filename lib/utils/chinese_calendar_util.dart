// lib/utils/chinese_calendar_util.dart
// 农历与中国节日信息封装工具（基于 lunar 包）
import 'package:intl/intl.dart';
import 'package:lunar/lunar.dart';

/// 农历与中国节日信息数据模型
class ChineseCalendarDayInfo {
  final DateTime date;
  final String lunarDay;
  final String lunarMonth;
  final String lunarYear;
  final String? jieQi;
  final List<String> lunarFestivals;
  final List<String> solarFestivals;
  final List<String> festivals;
  final String? primaryFestival;
  final bool isFestival;
  final String displayLabel;
  const ChineseCalendarDayInfo({
    required this.date,
    required this.lunarDay,
    required this.lunarMonth,
    required this.lunarYear,
    this.jieQi,
    required this.lunarFestivals,
    required this.solarFestivals,
    required this.festivals,
    this.primaryFestival,
    required this.isFestival,
    required this.displayLabel,
  });

  bool hasFestival(String name) {
    return festivals.any((f) => f.contains(name) || name.contains(f));
  }
}

/// 农历与中国节日纯函数工具类
class ChineseCalendarUtil {
  ChineseCalendarUtil._();

  static const Map<String, String> _shortFestivalNames = {
    '中秋节': '中秋',
    '端午节': '端午',
    '元宵节': '元宵',
    '重阳节': '重阳',
    '元旦节': '元旦',
    '国庆节': '国庆',
    '清明节': '清明',
    '七夕节': '七夕',
    '腊八节': '腊八',
  };

  static String shortenFestival(String festival) {
    return _shortFestivalNames[festival] ?? festival;
  }

  static ChineseCalendarDayInfo getDayInfo(DateTime date) {
    final normalized = DateTime(date.year, date.month, date.day);
    final solar = Solar.fromDate(normalized);
    final lunar = solar.getLunar();

    final lunarDay = lunar.getDayInChinese();
    final lunarMonth = lunar.getMonthInChinese();
    final lunarYear = lunar.getYearInChinese();

    final jieQiStr = lunar.getJieQi().trim();
    final jieQi = jieQiStr.isNotEmpty ? jieQiStr : null;

    final lunarFestivals = List<String>.from(lunar.getFestivals());
    final solarFestivals = List<String>.from(solar.getFestivals());

    final festivals = <String>[
      ...lunarFestivals,
      ...solarFestivals,
      if (jieQi != null &&
          !lunarFestivals.contains(jieQi) &&
          !solarFestivals.contains(jieQi))
        jieQi,
    ];

    String? primaryFestival;
    if (lunarFestivals.isNotEmpty) {
      primaryFestival = lunarFestivals.first;
    } else if (solarFestivals.isNotEmpty) {
      primaryFestival = solarFestivals.first;
    } else if (jieQi != null) {
      primaryFestival = jieQi;
    }

    final isFestival = festivals.isNotEmpty || jieQi != null;

    String displayLabel;
    if (primaryFestival != null) {
      displayLabel = shortenFestival(primaryFestival);
    } else {
      displayLabel = lunarDay;
    }

    return ChineseCalendarDayInfo(
      date: normalized,
      lunarDay: lunarDay,
      lunarMonth: lunarMonth,
      lunarYear: lunarYear,
      jieQi: jieQi,
      lunarFestivals: lunarFestivals,
      solarFestivals: solarFestivals,
      festivals: festivals,
      primaryFestival: primaryFestival,
      isFestival: isFestival,
      displayLabel: displayLabel,
    );
  }

  static String getLunarMonthString(DateTime monthDate) {
    final midMonth = DateTime(monthDate.year, monthDate.month, 15);
    final solar = Solar.fromDate(midMonth);
    final lunar = solar.getLunar();
    return '农历${lunar.getMonthInChinese()}月';
  }

  static String getMonthTitle(DateTime monthDate) {
    final zhMonth = DateFormat.yMMMM('zh_CN').format(monthDate);
    return '$zhMonth · ${getLunarMonthString(monthDate)}';
  }
}
