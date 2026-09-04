/// 领域枚举 —— AGENTS.md §5 定义。
/// 禁止在业务代码中硬编码枚举字符串（R6），一律 import 本文件。
/// 每个枚举提供 fromString（未知值抛 FormatException）与 valuesList。
library;

/// 任务分类
enum TaskCategory {
  communication('沟通'),
  learning('学习'),
  health('健康'),
  project('项目'),
  emotion('情绪'),
  habit('习惯'),
  planning('规划');

  const TaskCategory(this.value);
  final String value;

  static TaskCategory fromString(String s) {
    for (final e in TaskCategory.values) {
      if (e.value == s) return e;
    }
    throw FormatException('未知的 TaskCategory: $s');
  }

  static List<String> get valuesList =>
      TaskCategory.values.map((e) => e.value).toList();
}

/// 任务状态
enum TaskStatus {
  todo('未开始'),
  inProgress('进行中'),
  done('已完成'),
  delayed('延期'),
  cancelled('取消');

  const TaskStatus(this.value);
  final String value;

  static TaskStatus fromString(String s) {
    for (final e in TaskStatus.values) {
      if (e.value == s) return e;
    }
    throw FormatException('未知的 TaskStatus: $s');
  }

  static List<String> get valuesList =>
      TaskStatus.values.map((e) => e.value).toList();
}

/// 任务优先级
enum TaskPriority {
  high('高'),
  medium('中'),
  low('低');

  const TaskPriority(this.value);
  final String value;

  static TaskPriority fromString(String s) {
    for (final e in TaskPriority.values) {
      if (e.value == s) return e;
    }
    throw FormatException('未知的 TaskPriority: $s');
  }

  static List<String> get valuesList =>
      TaskPriority.values.map((e) => e.value).toList();
}

/// 重复规则
enum RepeatRule {
  none('无'),
  daily('每天'),
  weekly('每周'),
  monthly('每月'),
  custom('自定义');

  const RepeatRule(this.value);
  final String value;

  static RepeatRule fromString(String s) {
    for (final e in RepeatRule.values) {
      if (e.value == s) return e;
    }
    throw FormatException('未知的 RepeatRule: $s');
  }

  static List<String> get valuesList =>
      RepeatRule.values.map((e) => e.value).toList();
}

/// 情绪
enum Emotion {
  calm('平静'),
  happy('开心'),
  nervous('紧张'),
  anxious('焦虑'),
  angry('愤怒'),
  sad('难过'),
  tired('疲惫'),
  excited('兴奋'),
  satisfied('满足'),
  other('其他');

  const Emotion(this.value);
  final String value;

  static Emotion fromString(String s) {
    for (final e in Emotion.values) {
      if (e.value == s) return e;
    }
    throw FormatException('未知的 Emotion: $s');
  }

  static List<String> get valuesList =>
      Emotion.values.map((e) => e.value).toList();
}

/// 主题方向（改善|稳定|恶化）
enum ThemeDirection {
  improving('改善'),
  stable('稳定'),
  worsening('恶化');

  const ThemeDirection(this.value);
  final String value;

  static ThemeDirection fromString(String s) {
    for (final e in ThemeDirection.values) {
      if (e.value == s) return e;
    }
    throw FormatException('未知的 ThemeDirection: $s');
  }

  static List<String> get valuesList =>
      ThemeDirection.values.map((e) => e.value).toList();
}

/// 趋势方向与主题方向同义（AGENTS.md §5：TrendDirection(=ThemeDirection)）
typedef TrendDirection = ThemeDirection;

/// 总结类型
enum SummaryType {
  weekly('周'),
  monthly('月'),
  yearly('年');

  const SummaryType(this.value);
  final String value;

  static SummaryType fromString(String s) {
    for (final e in SummaryType.values) {
      if (e.value == s) return e;
    }
    throw FormatException('未知的 SummaryType: $s');
  }

  static List<String> get valuesList =>
      SummaryType.values.map((e) => e.value).toList();
}

/// 延期原因类型
enum DelayType {
  external('外部'),
  internal('内部'),
  avoidance('逃避');

  const DelayType(this.value);
  final String value;

  static DelayType fromString(String s) {
    for (final e in DelayType.values) {
      if (e.value == s) return e;
    }
    throw FormatException('未知的 DelayType: $s');
  }

  static List<String> get valuesList =>
      DelayType.values.map((e) => e.value).toList();
}

/// 取消原因类型
enum CancelType {
  active('主动'),
  passive('被动'),
  avoidance('逃避');

  const CancelType(this.value);
  final String value;

  static CancelType fromString(String s) {
    for (final e in CancelType.values) {
      if (e.value == s) return e;
    }
    throw FormatException('未知的 CancelType: $s');
  }

  static List<String> get valuesList =>
      CancelType.values.map((e) => e.value).toList();
}
