// lib/utils/fuzzy_search.dart
//
// 模糊 OR 搜索（TASK-EXT-11，对应需求 §35/§36）。
// 把「多词必须全部命中」改成 OR：先归一化（trim/lowercase/多空格/标点），
// 再 token 化（英文按空格分词；中文连续词补 2 字滑窗，使「苹果手机」能分别命中「苹果」「手机」），
// 命中任意 token 即可。评分优先级：完整短语 > 标题 > 多词命中数 > 内容 > 标签 > 时间新旧。
// 纯函数无 IO，便于单测，被 Memory/Note 搜索共用。

/// 归一化：trim + lowercase + 标点转空格 + 多空格合并。
String normalizeSearchText(String text) {
  var s = text.trim().toLowerCase();
  // 中文/英文标点统一转空格（保留中英文字母数字与 CJK）
  s = s.replaceAll(RegExp(r"[\p{P}\p{S}]", unicode: true), ' ');
  s = s.replaceAll(RegExp(r'\s+'), ' ');
  return s.trim();
}

bool _isCjk(int rune) {
  return (rune >= 0x4E00 && rune <= 0x9FFF) ||
      (rune >= 0x3400 && rune <= 0x4DBF);
}

bool _isAlphaNum(int rune) {
  return (rune >= 0x30 && rune <= 0x39) || // 0-9
      (rune >= 0x41 && rune <= 0x5A) || // A-Z
      (rune >= 0x61 && rune <= 0x7A); // a-z
}

/// 把查询拆成 token 集合：
/// - 空格分隔的词各自成 token（英文词整词、中文连续词整词 + 2 字滑窗）；
/// - 中文连续词（>2 字）额外生成 2 字滑窗，使「苹果手机」可命中「苹果」/「手机」。
List<String> tokenizeQuery(String rawQuery) {
  final norm = normalizeSearchText(rawQuery);
  if (norm.isEmpty) return <String>[];
  final tokens = <String>{};
  for (final part in norm.split(' ')) {
    if (part.isEmpty) continue;
    tokens.add(part);
    final hasCjk = part.runes.any(_isCjk);
    final hasAlpha = part.runes.any(_isAlphaNum);
    if (hasCjk && !hasAlpha && part.length > 2) {
      // 中文连续词：2 字滑窗
      for (var i = 0; i <= part.length - 2; i++) {
        tokens.add(part.substring(i, i + 2));
      }
    }
  }
  return tokens.toList(growable: false);
}

/// 命中判定 + 评分（0 = 完全不命中）。
/// [title]/[content]/[tags] 是待搜文本；[createdAt] 参与「时间新旧」尾分。
/// 分数含义（可比较，不承诺绝对值）：
/// 完整短语命中标题 +100 / 命中内容 +80
/// 单 token 命中标题 +40，命中内容 +20，命中标签 +10
/// 命中 token 数 × 5；近 7 天 +3、近 30 天 +1（时间尾分）
int scoreSearch({
  required String title,
  required String content,
  required List<String> tags,
  required String query,
  required DateTime createdAt,
}) {
  final normQuery = normalizeSearchText(query);
  if (normQuery.isEmpty) return 1; // 空查询：全部保留
  final normTitle = normalizeSearchText(title);
  final normContent = normalizeSearchText(content);
  final normTags =
      tags.map(normalizeSearchText).where((t) => t.isNotEmpty).toList();
  final tokens = tokenizeQuery(normQuery);
  if (tokens.isEmpty) return 1;

  int score = 0;
  int hitTokens = 0;
  // 完整短语（归一化后整串）命中 → 最高优先级
  if (normTitle.isNotEmpty && normTitle.contains(normQuery)) score += 100;
  if (normContent.contains(normQuery)) score += 80;
  // 逐 token：标题 > 内容 > 标签
  for (final t in tokens) {
    var hit = false;
    if (normTitle.isNotEmpty && normTitle.contains(t)) {
      score += 40;
      hit = true;
    }
    if (normContent.contains(t)) {
      score += 20;
      hit = true;
    }
    if (normTags.any((tag) => tag.contains(t))) {
      score += 10;
      hit = true;
    }
    if (hit) hitTokens++;
  }
  if (hitTokens == 0) return 0;
  score += hitTokens * 5;
  // 时间新旧尾分
  final age = DateTime.now().toUtc().difference(createdAt.toUtc());
  if (age.inDays <= 7) {
    score += 3;
  } else if (age.inDays <= 30) {
    score += 1;
  }
  return score;
}

/// 便捷过滤：true = 保留。
bool fuzzyMatches({
  required String title,
  required String content,
  required List<String> tags,
  required String query,
}) {
  if (normalizeSearchText(query).isEmpty) return true;
  final tokens = tokenizeQuery(query);
  if (tokens.isEmpty) return true;
  final normTitle = normalizeSearchText(title);
  final normContent = normalizeSearchText(content);
  final normTags =
      tags.map(normalizeSearchText).where((t) => t.isNotEmpty).toList();
  for (final t in tokens) {
    if ((normTitle.isNotEmpty && normTitle.contains(t)) ||
        normContent.contains(t) ||
        normTags.any((tag) => tag.contains(t))) {
      return true;
    }
  }
  return false;
}
