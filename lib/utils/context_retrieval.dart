import 'package:ai_life_recorder/models/context_pack.dart';
import 'package:ai_life_recorder/models/memory.dart';
import 'package:ai_life_recorder/models/photo.dart';
import 'package:ai_life_recorder/models/task.dart';
import 'package:ai_life_recorder/models/summary.dart';

List<String> extractKeywords(String text) {
  if (text.isEmpty) return <String>[];
  final stopChars = <String>{
    '的',
    '了',
    '是',
    '我',
    '你',
    '他',
    '在',
    '这',
    '个',
    '们',
    '吧',
    '呢'
  };
  final seen = <String>{};
  final result = <String>[];
  bool hasCJK = text.runes.any((r) {
    return (r >= 0x4E00 && r <= 0x9FFF) || (r >= 0x3400 && r <= 0x4DBF);
  });
  if (hasCJK) {
    final buffer = StringBuffer();
    for (var rune in text.runes) {
      if ((rune >= 0x4E00 && rune <= 0x9FFF) ||
          (rune >= 0x3400 && rune <= 0x4DBF)) {
        buffer.writeCharCode(rune);
      } else {
        buffer.write(' ');
      }
    }
    final segments =
        buffer.toString().split(RegExp(r'\s+')).where((s) => s.isNotEmpty);
    for (var seg in segments) {
      if (seg.length < 2) continue;
      for (var i = 0; i <= seg.length - 2; i++) {
        final token = seg.substring(i, i + 2);
        bool containsStop =
            token.runes.any((r) => stopChars.contains(String.fromCharCode(r)));
        if (containsStop) continue;
        if (!seen.contains(token)) {
          seen.add(token);
          result.add(token);
        }
      }
    }
    return result;
  } else {
    final parts = text.split(RegExp(r'\s+'));
    for (var p in parts) {
      var w = p.trim();
      if (w.isEmpty) continue;
      w = w.replaceAll(RegExp(r'^[^A-Za-z]+'), '');
      w = w.replaceAll(RegExp(r'[^A-Za-z]+$'), '');
      if (w.length >= 2) {
        final lower = w.toLowerCase();
        if (!seen.contains(lower)) {
          seen.add(lower);
          result.add(lower);
        }
      }
    }
    return result;
  }
}

double timeScore(DateTime a, DateTime b) {
  final au = a.toUtc();
  final bu = b.toUtc();
  final ad = DateTime.utc(au.year, au.month, au.day);
  final bd = DateTime.utc(bu.year, bu.month, bu.day);
  final diff = ad.difference(bd).inDays.abs();
  if (diff == 0) return 2.0;
  if (diff == 1) return 1.5;
  if (diff == 2) return 1.0;
  if (diff <= 7) return 0.5;
  return 0.0;
}

double _countKeywordHits(String text, List<String> keywords) {
  if (text.isEmpty || keywords.isEmpty) return 0.0;
  final lower = text.toLowerCase();
  double count = 0.0;
  for (var kw in keywords) {
    if (kw.isEmpty) continue;
    final kwLower = kw.toLowerCase();
    int start = 0;
    while (true) {
      final idx = lower.indexOf(kwLower, start);
      if (idx == -1) break;
      count += 1.0;
      start = idx + kwLower.length;
    }
  }
  return count;
}

ContextPack buildContextPack({
  required String eventDescription,
  String? emotion,
  String? actionTaken,
  String? result,
  required List<String> tags,
  required List<Memory> memories,
  required List<Photo> photos,
  required List<Task> tasks,
  required List<Summary> summaries,
}) {
  final now = DateTime.now().toUtc();
  final combinedTextParts = <String>[];
  combinedTextParts.add(eventDescription);
  if (emotion != null && emotion.isNotEmpty) combinedTextParts.add(emotion);
  if (actionTaken != null && actionTaken.isNotEmpty) {
    combinedTextParts.add(actionTaken);
  }
  if (result != null && result.isNotEmpty) combinedTextParts.add(result);
  final combinedText = combinedTextParts.join(' ');
  final keywords = extractKeywords(combinedText);
  double computeScoreForTagsAndText(
      List<String> recordTags, String text, DateTime date) {
    final tagIntersection = tags.where((t) => recordTags.contains(t)).length;
    final tagScore = 3.0 * tagIntersection;
    final kwHits = _countKeywordHits(text, keywords);
    final kwScore = 2.0 * kwHits;
    final tScore = timeScore(now, date);
    return tagScore + kwScore + tScore;
  }

  final memScores = <Map<String, dynamic>>[];
  for (var m in memories) {
    final text = '${m.content} ${m.aiSummary ?? ''}'.trim();
    final score = computeScoreForTagsAndText(m.tags, text, m.createdAt);
    if (score > 0) {
      memScores.add({'score': score, 'memory': m});
    }
  }
  memScores
      .sort((a, b) => (b['score'] as double).compareTo(a['score'] as double));
  final memItems = <ContextItem>[];
  for (var i = 0; i < memScores.length && i < 5; i++) {
    final m = memScores[i]['memory'] as Memory;
    final title = (m.title != null && m.title!.trim().isNotEmpty)
        ? m.title!
        : (m.content.length <= 20 ? m.content : m.content.substring(0, 20));
    memItems.add(
        ContextItem(id: m.id, title: title, date: m.createdAt, tags: m.tags));
  }
  final photoScores = <Map<String, dynamic>>[];
  for (var p in photos) {
    if (!p.summaryConfirmed) continue;
    final text = (p.aiSummary ?? '');
    final score = computeScoreForTagsAndText(p.tags, text, p.takenAt);
    if (score > 0) {
      photoScores.add({'score': score, 'photo': p});
    }
  }
  photoScores
      .sort((a, b) => (b['score'] as double).compareTo(a['score'] as double));
  final photoItems = <ContextItem>[];
  for (var i = 0; i < photoScores.length && i < 5; i++) {
    final p = photoScores[i]['photo'] as Photo;
    final title = (p.aiSummary != null && p.aiSummary!.trim().isNotEmpty)
        ? p.aiSummary!
        : p.localPath;
    photoItems.add(
        ContextItem(id: p.id, title: title, date: p.takenAt, tags: p.tags));
  }
  final taskScores = <Map<String, dynamic>>[];
  for (var t in tasks) {
    final text = '${t.title} ${t.description ?? ''}'.trim();
    final date = t.createdAt;
    // Task 无 tags 字段，只按关键词+时间评分
    final score = computeScoreForTagsAndText(const <String>[], text, date);
    if (score > 0) {
      taskScores.add({'score': score, 'task': t});
    }
  }
  taskScores
      .sort((a, b) => (b['score'] as double).compareTo(a['score'] as double));
  final taskItems = <ContextItem>[];
  for (var i = 0; i < taskScores.length && i < 5; i++) {
    final t = taskScores[i]['task'] as Task;
    final title = t.title;
    taskItems.add(
        ContextItem(id: t.id, title: title, date: t.createdAt, tags: const []));
  }
  final sumScores = <Map<String, dynamic>>[];
  for (var s in summaries) {
    final textParts = <String>[];
    if (s.content != null) textParts.add(s.content!);
    if (s.themes.isNotEmpty) textParts.add(s.themes.join(' '));
    if (s.highlights.isNotEmpty) textParts.add(s.highlights.join(' '));
    final text = textParts.join(' ');
    final date = s.periodStart;
    final score = computeScoreForTagsAndText(s.themes, text, date);
    if (score > 0) {
      sumScores.add({'score': score, 'summary': s});
    }
  }
  sumScores
      .sort((a, b) => (b['score'] as double).compareTo(a['score'] as double));
  final summaryItems = <ContextItem>[];
  for (var i = 0; i < sumScores.length && i < 5; i++) {
    final s = sumScores[i]['summary'] as Summary;
    final title = (s.content != null && s.content!.trim().isNotEmpty)
        ? (s.content!.length <= 20 ? s.content! : s.content!.substring(0, 20))
        : (s.themes.isNotEmpty ? s.themes.join('、') : '');
    summaryItems.add(ContextItem(
        id: s.id, title: title, date: s.periodStart, tags: s.themes));
  }
  return ContextPack(
    memories: memItems,
    photos: photoItems,
    tasks: taskItems,
    summaries: summaryItems,
  );
}
