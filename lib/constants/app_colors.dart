// lib/constants/app_colors.dart
//
// 应用色彩体系。
import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ================= 原有字段（保留字段名，兼容现有引用） =================

  /// 主色：清爽天蓝 / 湖蓝
  static const Color primary = Color(0xFF57B8E3);

  /// 全局背景：柔和奶白（带一点暖调）
  static const Color background = Color(0xFFFFF8F2);

  /// 次要文字 / 中性色：柔和灰蓝
  static const Color neutral = Color(0xFF98A3B3);

  /// 卡片底色
  static const Color card = Colors.white;

  /// 成功色：薄荷绿系
  static const Color success = Color(0xFF4FBF95);

  /// 警示色：奶油橙系
  static const Color warning = Color(0xFFFF9A5A);

  /// 错误色：柔和珊瑚红
  static const Color error = Color(0xFFFF6B81);

  /// 强调/高亮（紫）——保留兼容
  static const Color accent = Color(0xFFB39DDB);

  // ================= 新增：马卡龙 / 奶昔可爱辅助色 =================

  static const Color softPink = Color(0xFFFF9EC5);
  static const Color softYellow = Color(0xFFFFD76A);
  static const Color mint = Color(0xFF7ED9B7);
  static const Color creamOrange = Color(0xFFFFB07C);
  static const Color lavender = Color(0xFFB39DDB);

  /// 主色浅色版本，用于高亮 / 渐变背景
  static const Color primaryLight = Color(0xFFAEE3F5);

  /// 底部导航未选中态使用的柔和灰蓝（而非死灰）
  static const Color mutedIcon = Color(0xFFB9C4D6);

  // ================= 各模块主题色（让每类内容都有记忆点） =================

  /// 记忆 = 薄荷绿系
  static const Color memoryAccent = mint;

  /// 照片 = 奶油橙系
  static const Color photoAccent = creamOrange;

  /// 反思 = 薰衣草紫系
  static const Color reflectionAccent = lavender;

  /// 任务 = 天蓝系
  static const Color taskAccent = primary;

  /// 总结 = 暖黄系
  static const Color summaryAccent = softYellow;

  // ================= 渐变色组 =================

  static const List<Color> primaryGradient = [
    Color(0xFF82D3F0),
    Color(0xFF4AA8D8),
  ];

  static const List<Color> memoryGradient = [
    Color(0xFFB2EBD4),
    Color(0xFF6BC9A0),
  ];

  static const List<Color> photoGradient = [
    Color(0xFFFFD6B0),
    Color(0xFFFF9F6E),
  ];

  static const List<Color> reflectionGradient = [
    Color(0xFFDBCBF6),
    Color(0xFFAE91DF),
  ];

  static const List<Color> taskGradient = [
    Color(0xFFC1E8F8),
    Color(0xFF60B5DD),
  ];

  static const List<Color> summaryGradient = [
    Color(0xFFFFEDB0),
    Color(0xFFFFCE68),
  ];

  /// 页面整体柔和背景渐变（奶白 → 浅粉蓝）
  static const List<Color> pageBackgroundGradient = [
    Color(0xFFFFFBF6),
    Color(0xFFF1F7FF),
  ];
}