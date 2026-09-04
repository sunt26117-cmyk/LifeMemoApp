// src/utils/fuzzySearch.ts

export function normalizeSearchText(text: string): string {
  let s = text.trim().toLowerCase();
  // Replace punctuation and symbols with space
  s = s.replace(/[\p{P}\p{S}]/gu, ' ');
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}

function isCjk(code: number): boolean {
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

function isAlphaNum(code: number): boolean {
  return (
    (code >= 0x30 && code <= 0x39) || // 0-9
    (code >= 0x41 && code <= 0x5a) || // A-Z
    (code >= 0x61 && code <= 0x7a)    // a-z
  );
}

export function tokenizeQuery(rawQuery: string): string[] {
  const norm = normalizeSearchText(rawQuery);
  if (!norm) return [];
  const tokens = new Set<string>();

  const parts = norm.split(' ');
  for (const part of parts) {
    if (!part) continue;
    tokens.add(part);

    let hasCjk = false;
    let hasAlpha = false;
    for (let i = 0; i < part.length; i++) {
      const code = part.charCodeAt(i);
      if (isCjk(code)) hasCjk = true;
      if (isAlphaNum(code)) hasAlpha = true;
    }

    if (hasCjk && !hasAlpha && part.length > 2) {
      // 2-character sliding window
      for (let i = 0; i <= part.length - 2; i++) {
        tokens.add(part.substring(i, i + 2));
      }
    }
  }

  return Array.from(tokens);
}

export function scoreSearch(params: {
  title: string;
  content: string;
  tags: string[];
  query: string;
  createdAt: string | Date;
}): number {
  const { title, content, tags, query, createdAt } = params;
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return 1;

  const normTitle = normalizeSearchText(title);
  const normContent = normalizeSearchText(content);
  const normTags = tags.map(normalizeSearchText).filter(Boolean);
  const tokens = tokenizeQuery(normQuery);
  if (tokens.length === 0) return 1;

  let score = 0;
  let hitTokens = 0;

  if (normTitle && normTitle.includes(normQuery)) score += 100;
  if (normContent.includes(normQuery)) score += 80;

  for (const t of tokens) {
    let hit = false;
    if (normTitle && normTitle.includes(t)) {
      score += 40;
      hit = true;
    }
    if (normContent.includes(t)) {
      score += 20;
      hit = true;
    }
    if (normTags.some((tag) => tag.includes(t))) {
      score += 10;
      hit = true;
    }
    if (hit) hitTokens++;
  }

  if (hitTokens === 0) return 0;
  score += hitTokens * 5;

  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const ageDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) {
    score += 3;
  } else if (ageDays <= 30) {
    score += 1;
  }

  return score;
}

export function fuzzyMatches(params: {
  title: string;
  content: string;
  tags: string[];
  query: string;
}): boolean {
  const { title, content, tags, query } = params;
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return true;

  const tokens = tokenizeQuery(normQuery);
  if (tokens.length === 0) return true;

  const normTitle = normalizeSearchText(title);
  const normContent = normalizeSearchText(content);
  const normTags = tags.map(normalizeSearchText).filter(Boolean);

  for (const t of tokens) {
    if (
      (normTitle && normTitle.includes(t)) ||
      normContent.includes(t) ||
      normTags.some((tag) => tag.includes(t))
    ) {
      return true;
    }
  }

  return false;
}

export interface FuzzySearchResult<T> {
  item: T;
  score: number;
}

export function fuzzySearch<T>(params: {
  items: T[];
  query: string;
  getTexts: (item: T) => string[];
}): FuzzySearchResult<T>[] {
  const { items, query, getTexts } = params;
  const normQuery = normalizeSearchText(query);
  if (!normQuery) {
    return items.map((item) => ({ item, score: 1 }));
  }

  const tokens = tokenizeQuery(normQuery);
  if (tokens.length === 0) {
    return items.map((item) => ({ item, score: 1 }));
  }

  const results: FuzzySearchResult<T>[] = [];

  for (const item of items) {
    const texts = getTexts(item).map(normalizeSearchText).filter(Boolean);
    let score = 0;
    let hitTokens = 0;

    for (const text of texts) {
      if (text.includes(normQuery)) {
        score += 100;
      }
    }

    for (const t of tokens) {
      let hit = false;
      for (const text of texts) {
        if (text.includes(t)) {
          score += 20;
          hit = true;
        }
      }
      if (hit) hitTokens++;
    }

    if (hitTokens > 0) {
      results.push({ item, score: score + hitTokens * 5 });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

