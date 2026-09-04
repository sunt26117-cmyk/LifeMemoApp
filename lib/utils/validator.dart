import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/models/context_pack.dart';

class Violation {
  final String rule;
  final String detail;
  Violation({required this.rule, required this.detail});
}

class ValidationResult {
  final bool passed;
  final List<Violation> violations;
  ValidationResult({required this.passed, required this.violations});
}

ValidationResult validate(ReflectionSummary s, ContextPack c) {
  final List<Violation> violations = [];
  final Map<String, String?> requiredFields = {
    'eventSummary': s.eventSummary,
    'goodPoints': s.goodPoints,
    'ignoredFactors': s.ignoredFactors,
    'improvementPoints': s.improvementPoints,
    'nextSuggestion': s.nextSuggestion,
  };
  requiredFields.forEach((name, value) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) {
      violations.add(Violation(rule: 'V1', detail: '字段 $name 不能为空或仅包含空白。'));
    }
  });
  final List<String> psychological = [
    '内在',
    '自我接纳',
    '安全感',
    '原生家庭',
    '潜意识',
    '疗愈',
    '情绪疏导',
    '心理'
  ];
  final List<String> personality = [
    '性格',
    '人格',
    '你就是',
    '你总是',
    '你从来',
    '拖延型',
    '内向的人'
  ];
  final List<String> blacklist = [...psychological, ...personality];
  final List<String?> aiFields = [
    s.eventSummary,
    s.goodPoints,
    s.ignoredFactors,
    s.improvementPoints,
    s.nextSuggestion,
    s.suggestedTask
  ];
  final List<String> aiFieldNames = [
    'eventSummary',
    'goodPoints',
    'ignoredFactors',
    'improvementPoints',
    'nextSuggestion',
    'suggestedTask'
  ];
  for (var i = 0; i < aiFields.length; i++) {
    final text = aiFields[i] ?? '';
    final name = aiFieldNames[i];
    for (final word in blacklist) {
      if (text.contains(word)) {
        violations
            .add(Violation(rule: 'V2', detail: '字段 $name 包含黑名单词语："$word"。'));
      }
    }
  }
  final memoryIdSet = c.memories.map((m) => m.id).toSet();
  final photoIdSet = c.photos.map((p) => p.id).toSet();
  final citations = s.citations;
  for (final memId in citations.memoryIds) {
    if (!memoryIdSet.contains(memId)) {
      violations
          .add(Violation(rule: 'V3', detail: '引用的 memoryId 不存在："$memId"。'));
    }
  }
  for (final photoId in citations.photoIds) {
    if (!photoIdSet.contains(photoId)) {
      violations
          .add(Violation(rule: 'V3', detail: '引用的 photoId 不存在："$photoId"。'));
    }
  }
  final List<String> verbWhitelist = [
    '制定',
    '列出',
    '写',
    '记录',
    '确认',
    '设置',
    '添加',
    '使用',
    '建立',
    '执行',
    '保存',
    '检查',
    '创建',
    '安排',
    '发送',
    '准备',
    '复习',
    '更新',
    '关闭',
    '开启'
  ];
  bool startsWithAllowedVerb(String text) {
    for (final v in verbWhitelist) {
      if (text.startsWith(v)) return true;
    }
    return false;
  }

  void checkSuggestionField(String name, String? value) {
    final trimmed = (value ?? '').trim();
    if (trimmed.isEmpty) {
      return;
    }
    if (trimmed.length < 4) {
      violations
          .add(Violation(rule: 'V4', detail: '字段 $name 长度小于 4："$trimmed"。'));
      return;
    }
    if (!startsWithAllowedVerb(trimmed)) {
      violations
          .add(Violation(rule: 'V4', detail: '字段 $name 未以白名单动词开头："$trimmed"。'));
    }
  }

  checkSuggestionField('nextSuggestion', s.nextSuggestion);
  checkSuggestionField('suggestedTask', s.suggestedTask);
  final List<String> inferenceMarkers = ['可能因为', '也许是你', '你其实', '你应该感到'];
  for (var i = 0; i < aiFields.length; i++) {
    final text = aiFields[i] ?? '';
    final name = aiFieldNames[i];
    for (final marker in inferenceMarkers) {
      if (text.contains(marker)) {
        violations.add(Violation(
            rule: 'V5', detail: '字段 $name 包含推断标记 "$marker"："$text"。'));
      }
    }
  }
  return ValidationResult(passed: violations.isEmpty, violations: violations);
}
