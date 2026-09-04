# 打卡日历美化 + 农历/中国节日 派单 · 文件 2/2：修改要求

> 与「文件 1（现有源码 + lunar API 事实）」配套。基于文件 1 源码修改，输出完整新文件（非 diff）。

## 目标（用户 2026-09-05）
现有「日历打卡」页（lib/screens/checkin/check_in_calendar_screen.dart）太朴素单调，要求：
1. **界面美化**成温暖、精致、有生活感的马卡龙风格（对齐现有 AppColors 马卡龙暖色系：奶白底/湖蓝主色/薄荷绿/奶油橙/薰衣草紫，
   见文件 1 中 app_colors.dart 全量配色）。当前 App 整体是"私人生活感"审美，不要做成数据后台/仪表盘风格。
2. **日期格显示农历**（如「初一」「十五」）与**中国重要节日**（春节/元宵/端午/中秋/重阳/清明等农历节日 + 元旦/国庆/劳动节等公历节日），
   有节日的日期格高亮或小角标提示。
3. 顶部月份切换保留；星期表头保留；「今天」标识、打卡符号（emoji 泡泡）、过去只读/今天可编辑/未来禁打 的交互**全部保留不变**。

## 实现要求（逐条）
1. **农历与节日数据**：使用已在 pubspec 添加的 `lunar` 包（^1.7.8，纯 Dart，已在依赖白名单）。
   禁止手写农历算法。用法（真实 API，见文件 1）：
   ```dart
   import 'package:lunar/lunar.dart';
   final solar = Solar.fromDate(dayDateTime);
   final lunar = solar.getLunar();
   final lunarDay = lunar.getDayInChinese();   // 如「初一」「十五」
   final festivals = lunar.getFestivals();     // 如春节/中秋
   final otherFestivals = lunar.getOtherFestivals();
   final jieQi = lunar.getJieQi();             // 节气（空串=无）
   ```
2. **界面美化建议方向**（可自行发挥，但必须保持：页面仍是月历打卡、交互不变、中文文案）：
   - 月份标题带农历月份信息（如「2026年9月 · 农历八月」）；
   - 日期格圆角卡片化：今天用主色描边/浅底，有打卡的日期格底部一排小 emoji，有节日/节气的日期格右上角小圆点或特殊色；
   - 星期表头柔和配色；整体背景可沿用 AppColors.background 或 pageBackgroundGradient 渐变；
   - 打卡日期格、今天、节日、普通日要有明确视觉区分但保持柔和（马卡龙、不刺眼）。
3. **保留不破坏**：CheckInCalendarScreen 的 `_onDayTap`（今天弹 TodayCheckInPanel 多选覆盖提交 / 过去只读弹窗 / 未来禁打）、
   `_recordsCache`、`_submitToday` 覆盖式逻辑、`_refreshRecords`、月份切换。只美化视觉 + 加农历/节日信息层。
4. 如需把某日是否节日做成纯函数便于测试，可新增 lib/utils/chinese_calendar_util.dart（Solar→(农历日/节日/节气) 的封装），
   并给该文件写单元测试（给定 2026 春节/中秋等已知日期断言节日命中；农历初一/十五断言）——如有新增此文件请一并交付测试。

## 禁止
- 不改交互/数据逻辑（覆盖式提交、日期权限、打卡符号存储）；不改 CheckInRecord/CheckInType 模型与仓库。
- 不改依赖白名单之外的东西；lunar 已批准，勿再加其它包。
- 不引入 table_calendar 等日历控件（保持原生 GridView 自绘，避免白名单外依赖）。
- UI 文案中文；风格马卡龙柔和，不数据后台化。

## 验收（本地自测后报告）
- flutter analyze 0 issues；flutter test 全绿（现有 280 测试不受影响；新增 util 测试含入）。
- 交付：改动文件清单 + 每个文件完整新版本（非 diff）；若新增 lib/utils/chinese_calendar_util.dart 需附对应测试文件。
