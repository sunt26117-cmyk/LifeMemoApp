import 'dart:convert';

import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/constants/enums.dart';

const String safetyTail = '不推断未写内容 / 不评价人格 / 不生成心理咨询内容 / 只引用给定上下文';
String memorySummaryPrompt({
  required String content,
  required List<String> tags,
}) {
  final tagsLine = tags.isEmpty ? '无' : tags.join(', ');
  return ''' 请基于以下内容生成 1-2 句的事实型摘要，直接陈述事实，不进行推断或加入情绪。 输入内容： $content 标签： $tagsLine 输出仅为一句或两句简洁事实摘要，不要多余说明。 $safetyTail ''';
}

String photoSummaryPrompt({
  required String takenAt,
  required List<String> tags,
}) {
  final tagsLine = tags.isEmpty ? '无' : tags.join(', ');
  return ''' 这是一张生活照片，拍摄时间：$takenAt，标签：$tagsLine。请用 1-2 句客观描述照片可能的场景内容（如环境、物品、活动类型），仅描述画面中可见的事实，禁止识别或猜测照片中的人物身份、关系、年龄、性别，禁止推断动机或情绪。输出仅为一两句简洁描述。 $safetyTail ''';
}

String reflectionPrompt({
  required String eventDescription,
  String? emotion,
  String? actionTaken,
  String? result,
  required List<String> tags,
  required ContextPack pack,
}) {
  String listContext(String title, List<dynamic> items) {
    if (items.isEmpty) return '无相关上下文';
    final buf = StringBuffer();
    for (final it in items) {
      buf.writeln(
          '- id: ${it.id}; title: ${it.title}; date: ${it.date.toIso8601String()}; tags: ${it.tags.join(", ")}');
    }
    return buf.toString().trim();
  }

  final memories = listContext('memories', pack.memories);
  final photos = listContext('photos', pack.photos);
  final tasks = listContext('tasks', pack.tasks);
  final summaries = listContext('summaries', pack.summaries);
  final tagsLine = tags.isEmpty ? '无' : tags.join(', ');
  return ''' 请基于以下事件描述进行反思，输出严格的 JSON 对象（不要额外文本），格式如下： { "eventSummary": string, "goodPoints": string, "ignoredFactors": string, "improvementPoints": string, "nextSuggestion": string, "suggestedTask": string|null, "citations": {"memoryIds": [string], "photoIds": [string]} } 说明： - eventSummary 为对事件的简洁总结（1-3 句）。 - goodPoints/ignoredFactors/improvementPoints/nextSuggestion 为文本，均为非空字符串（suggestedTask 可为 null）。 - citations 只能引用给定上下文中的 id，若无引用请返回空数组。 输入： 事件描述： $eventDescription 情绪（可选）： ${emotion ?? '无'} 采取的行动（可选）： ${actionTaken ?? '无'} 结果（可选）： ${result ?? '无'} 标签： $tagsLine 相关上下文： 记忆： $memories 照片： $photos 任务： $tasks 总结： $summaries 输出必须是有效 JSON，字段名严格按要求，且不要包含多余说明或代码块。 $safetyTail ''';
}

String taskDecomposePrompt({
  required String title,
  String? description,
}) {
  final desc = (description == null || description.trim().isEmpty)
      ? '无'
      : description.trim();
  return ''' 请将以下任务拆解为 3 到 5 个步骤，每步以动词开头，简洁明确，便于执行。 任务标题： $title 任务描述： $desc 输出严格的 JSON 对象： {"steps": [ "第一步", "第二步", ... ]} 仅返回 JSON，不要额外说明。 $safetyTail ''';
}

String summaryPrompt({
  required SummaryType type,
  required Map<String, dynamic> aggregate,
}) {
  final agg = jsonEncode(aggregate);
  if (type == SummaryType.yearly) {
    return ''' 请基于以下年度聚合数据生成年度总结。你必须严格返回一个 JSON object，不允许返回 Markdown、代码块、解释文字或其他内容。 返回结构必须严格为： { "annualTheme": "一句话概括这一年的核心主题", "highlights": ["年度亮点1", "年度亮点2"], "behaviorTrend": "总结这一年的行为习惯、记录行为、行动模式和明显变化。", "moodTrend": "总结这一年的整体情绪分布、变化趋势和值得注意的情绪特点。", "lifeRhythm": "总结这一年的生活节奏、记录节奏和明显规律。", "annualReflection": "对这一年进行完整反思，总结成长、变化、问题与值得保留的经验。", "nextYearSuggestions": ["下一年建议1", "下一年建议2"] } 严格要求： 1. annualTheme 必须是简洁明确的一句话。 2. highlights 必须是字符串数组。 3. behaviorTrend 必须是字符串。 4. moodTrend 必须是字符串。 5. lifeRhythm 必须是字符串。 6. annualReflection 必须是字符串。 7. nextYearSuggestions 必须是字符串数组。 8. 所有字段名必须完全按照指定名称返回。 9. 只能返回有效 JSON。 10. 不得增加 Markdown、前缀、后缀或解释文字。 11. 所有分析必须基于 aggregate 中提供的年度数据，不得凭空虚构事实。 聚合数据： $agg $safetyTail ''';
  }
  return ''' 请基于以下聚合数据生成一段总结，输出严格 JSON： { "content": string, "themes": [string], "highlights": [string], "taskSuggestions": [string] } 要求： - content 为总结性段落。 - themes 为 3 个主题关键词。 - highlights 为 3 个亮点或重要事件。 - taskSuggestions 为 2-4 条建议，每条以动词开头。 聚合数据： $agg 仅返回 JSON，不要额外说明。 $safetyTail ''';
}

/// 小记 AI 整理（TASK-EXT-08）：把原文整理为更清晰通顺的段落，不改事实、不新增内容。
String noteOrganizePrompt({required String content, String? title}) {
  final titleLine = (title == null || title.trim().isEmpty) ? '（无标题）' : title;
  return ''' 以下是一则用户随手记的小记。请把它整理成结构清晰、通顺易读的文字，要求：
  1. 只重排/润色用户已写的内容，不补充用户没写的事实，不推断动机情绪。
  2. 保留原有信息点，不遗漏。
  3. 直接输出整理后的正文（纯文本，不要 JSON、不要解释、不要 Markdown 标记）。
  标题： $titleLine
  原文： $content
  $safetyTail ''';
}

String growthAnalysisPrompt({
  required List<double> scores,
  required List<String> labels,
}) {
  final zipped = <String>[];
  for (var i = 0; i < scores.length && i < labels.length; i++) {
    zipped.add('${labels[i]}: ${scores[i].toStringAsFixed(1)}');
  }
  final dataLine = zipped.isEmpty ? '无' : zipped.join('；');
  return ''' 请基于以下成长曲线数据生成一段温和、鼓励性的自然语言分析，输出严格的 JSON 对象： { "analysis": "string" } 要求： - analysis 为一段简洁的成长分析，描述整体走势和值得注意的变化。 - 语气积极、温和，不做心理诊断，不使用「落后」「失败」「你应该更努力」等压力性表达。 - 不推断未在数据中体现的原因，不评价人格。 数据： $dataLine $safetyTail ''';
}
