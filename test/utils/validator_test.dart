import 'package:flutter_test/flutter_test.dart';
import 'package:ai_life_recorder/models/reflection_summary.dart';
import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/utils/validator.dart';

void main() {
  ContextPack makeContextPack(
      {List<String>? memoryIds, List<String>? photoIds}) {
    final mems = (memoryIds ?? ['m1', 'm2'])
        .map((id) =>
            ContextItem(id: id, title: 't-$id', date: DateTime.now(), tags: []))
        .toList();
    final photos = (photoIds ?? ['p1', 'p2'])
        .map((id) =>
            ContextItem(id: id, title: 't-$id', date: DateTime.now(), tags: []))
        .toList();
    return ContextPack(
        memories: mems, photos: photos, tasks: [], summaries: []);
  }

  ReflectionSummary makeValidSummary({
    String? eventSummary,
    String? goodPoints,
    String? ignoredFactors,
    String? improvementPoints,
    String? nextSuggestion,
    String? suggestedTask,
    List<String>? memoryIds,
    List<String>? photoIds,
  }) {
    return ReflectionSummary(
      eventSummary: eventSummary ?? '事件描述，发生了 X，影响 Y。',
      goodPoints: goodPoints ?? '做得好的点：专注、及时。',
      ignoredFactors: ignoredFactors ?? '被忽略的因素：时间管理。',
      improvementPoints: improvementPoints ?? '改进点：提前准备。',
      nextSuggestion: nextSuggestion ?? '制定下一步计划并执行。',
      suggestedTask: suggestedTask,
      citations: Citations(
        memoryIds: memoryIds ?? ['m1'],
        photoIds: photoIds ?? ['p1'],
      ),
    );
  }

  test('1 合法输出通过', () {
    final c = makeContextPack();
    final s = makeValidSummary();
    final r = validate(s, c);
    expect(r.passed, isTrue);
    expect(r.violations, isEmpty);
  });
  test('2 五字段任一为空触发 V1', () {
    final c = makeContextPack();
    final s = makeValidSummary(eventSummary: ' ');
    final r = validate(s, c);
    expect(r.passed, isFalse);
    expect(r.violations.any((v) => v.rule == 'V1'), isTrue);
    expect(r.violations.any((v) => v.detail.contains('eventSummary')), isTrue);
  });
  test('3 黑名单词每类至少 2 条触发 V2', () {
    final c = makeContextPack();
    final s = makeValidSummary(
      eventSummary: '我感到缺乏安全感，需要疗愈。',
      goodPoints: '你的性格很稳定，你总是很努力。',
    );
    final r = validate(s, c);
    final v2s = r.violations.where((v) => v.rule == 'V2').toList();
    expect(v2s.length >= 4, isTrue);
    expect(v2s.any((v) => v.detail.contains('安全感')), isTrue);
    expect(v2s.any((v) => v.detail.contains('疗愈')), isTrue);
    expect(v2s.any((v) => v.detail.contains('性格')), isTrue);
    expect(v2s.any((v) => v.detail.contains('你总是')), isTrue);
  });
  test('4 编造 memoryId/photoId 触发 V3', () {
    final c = makeContextPack(memoryIds: ['m1'], photoIds: ['p1']);
    final s =
        makeValidSummary(memoryIds: ['m1', 'm_fake'], photoIds: ['p_fake']);
    final r = validate(s, c);
    final v3s = r.violations.where((v) => v.rule == 'V3').toList();
    expect(v3s.length, equals(2));
    expect(v3s.any((v) => v.detail.contains('m_fake')), isTrue);
    expect(v3s.any((v) => v.detail.contains('p_fake')), isTrue);
  });
  test('5 "要多沟通" 触发 V4（非动词+太短）', () {
    final c = makeContextPack();
    final s = makeValidSummary(nextSuggestion: '要多沟通', suggestedTask: '要多沟通');
    final r = validate(s, c);
    final v4s = r.violations.where((v) => v.rule == 'V4').toList();
    expect(v4s.length >= 2, isTrue);
    expect(v4s.any((v) => v.detail.contains('nextSuggestion')), isTrue);
    expect(v4s.any((v) => v.detail.contains('suggestedTask')), isTrue);
  });
  test('6 "制定沟通前确认清单" 通过 V4', () {
    final c = makeContextPack();
    final s = makeValidSummary(
      nextSuggestion: '制定沟通前确认清单',
      suggestedTask: '制定沟通前确认清单',
    );
    final r = validate(s, c);
    expect(r.violations.where((v) => v.rule == 'V4'), isEmpty);
  });
  test('7 含 "可能因为" 触发 V5', () {
    final c = makeContextPack();
    final s = makeValidSummary(eventSummary: '可能因为压力导致失眠。');
    final r = validate(s, c);
    expect(r.violations.any((v) => v.rule == 'V5'), isTrue);
    expect(r.violations.any((v) => v.detail.contains('可能因为')), isTrue);
  });
  test('8 含 "也许是你" 触发 V5', () {
    final c = makeContextPack();
    final s = makeValidSummary(goodPoints: '也许是你太在意细节。');
    final r = validate(s, c);
    expect(r.violations.any((v) => v.rule == 'V5'), isTrue);
    expect(r.violations.any((v) => v.detail.contains('也许是你')), isTrue);
  });
  test('9 合法 id 引用通过 V3', () {
    final c = makeContextPack(memoryIds: ['mA'], photoIds: ['pA']);
    final s = makeValidSummary(memoryIds: ['mA'], photoIds: ['pA']);
    final r = validate(s, c);
    expect(r.violations.where((v) => v.rule == 'V3'), isEmpty);
  });
  test('10 violations 返回正确的 rule 编号', () {
    final c = makeContextPack(memoryIds: ['m1'], photoIds: ['p1']);
    final s = makeValidSummary(
      eventSummary: '可能因为安全感不足，你总是回避。',
      nextSuggestion: '要多沟通',
      memoryIds: ['m_fake'],
      photoIds: ['p_fake'],
    );
    final r = validate(s, c);
    final rules = r.violations.map((v) => v.rule).toSet();
    expect(rules.contains('V2'), isTrue);
    expect(rules.contains('V3'), isTrue);
    expect(rules.contains('V4'), isTrue);
    expect(rules.contains('V5'), isTrue);
  });
  test('11 suggestedTask=null 且其他合法 → 通过', () {
    final c = makeContextPack();
    final s = makeValidSummary(suggestedTask: null);
    final r = validate(s, c);
    expect(r.passed, isTrue);
    expect(r.violations, isEmpty);
  });
  test('12 citations 空对象 → 通过', () {
    final c = makeContextPack();
    final s = ReflectionSummary(
      eventSummary: '事件正常。',
      goodPoints: '好的点。',
      ignoredFactors: '无。',
      improvementPoints: '改进。',
      nextSuggestion: '制定计划并执行。',
      suggestedTask: null,
      citations: Citations(memoryIds: [], photoIds: []),
    );
    final r = validate(s, c);
    expect(r.passed, isTrue);
    expect(r.violations, isEmpty);
  });
  test('13 nextSuggestion="你应该感到开心" → V5 触发', () {
    final c = makeContextPack();
    final s = makeValidSummary(nextSuggestion: '你应该感到开心');
    final r = validate(s, c);
    expect(r.violations.any((v) => v.rule == 'V5'), isTrue);
    expect(r.violations.any((v) => v.detail.contains('你应该感到')), isTrue);
  });
  test('14 多违规同时存在 → violations 包含全部', () {
    final c = makeContextPack(memoryIds: ['m1'], photoIds: ['p1']);
    final s = makeValidSummary(
      eventSummary: '可能因为安全感不足。',
      goodPoints: '你总是很好。',
      ignoredFactors: ' ',
      improvementPoints: '改进点',
      nextSuggestion: '要多沟通',
      suggestedTask: '制定计划',
      memoryIds: ['m_fake'],
      photoIds: ['p_fake'],
    );
    final r = validate(s, c);
    final rules = r.violations.map((v) => v.rule).toSet();
    expect(rules.contains('V1'), isTrue);
    expect(rules.contains('V2'), isTrue);
    expect(rules.contains('V3'), isTrue);
    expect(rules.contains('V4'), isTrue);
    expect(rules.contains('V5'), isTrue);
  });
  test('15 无违规 → passed=true 且 violations 为空列表', () {
    final c = makeContextPack(memoryIds: ['mX'], photoIds: ['pX']);
    final s = makeValidSummary(
      eventSummary: '今天完成了预定任务，效率提升。',
      goodPoints: '按计划完成，沟通顺畅。',
      ignoredFactors: '外部干扰较少。',
      improvementPoints: '下次提前准备材料。',
      nextSuggestion: '制定下一周计划并执行。',
      suggestedTask: '制定下一周计划并执行。',
      memoryIds: ['mX'],
      photoIds: ['pX'],
    );
    final r = validate(s, c);
    expect(r.passed, isTrue);
    expect(r.violations, isEmpty);
  });
}
