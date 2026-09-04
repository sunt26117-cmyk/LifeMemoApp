// src/utils/contextRetrieval.ts
import { ContextItem, ContextPack, Memory, Photo, Task, Summary } from '../types';

export function extractKeywords(text: string): string[] {
  if (!text) return [];
  const stopChars = new Set(['的', '了', '是', '我', '你', '他', '在', '这', '个', '们', '吧', '呢']);
  const seen = new Set<string>();
  const result: string[] = [];

  let hasCJK = false;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) {
      hasCJK = true;
      break;
    }
  }

  if (hasCJK) {
    let cleaned = '';
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) {
        cleaned += text[i];
      } else {
        cleaned += ' ';
      }
    }
    const segments = cleaned.split(/\s+/).filter(Boolean);
    for (const seg of segments) {
      if (seg.length < 2) continue;
      for (let i = 0; i <= seg.length - 2; i++) {
        const token = seg.substring(i, i + 2);
        if (Array.from(token).some((c) => stopChars.has(c))) continue;
        if (!seen.has(token)) {
          seen.add(token);
          result.push(token);
        }
      }
    }
    return result;
  } else {
    const parts = text.split(/\s+/);
    for (const p of parts) {
      const w = p.trim().replace(/^[^A-Za-z]+/, '').replace(/[^A-Za-z]+$/, '');
      if (w.length >= 2) {
        const lower = w.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          result.push(lower);
        }
      }
    }
    return result;
  }
}

export function timeScore(aDate: string | Date, bDate: string | Date): number {
  const a = typeof aDate === 'string' ? new Date(aDate) : aDate;
  const b = typeof bDate === 'string' ? new Date(bDate) : bDate;
  const aDay = Math.floor(a.getTime() / (1000 * 60 * 60 * 24));
  const bDay = Math.floor(b.getTime() / (1000 * 60 * 60 * 24));
  const diff = Math.abs(aDay - bDay);
  if (diff === 0) return 2.0;
  if (diff === 1) return 1.5;
  if (diff === 2) return 1.0;
  if (diff <= 7) return 0.5;
  return 0.0;
}

function countKeywordHits(text: string, keywords: string[]): number {
  if (!text || keywords.length === 0) return 0;
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    if (!kw) continue;
    const kwLower = kw.toLowerCase();
    let start = 0;
    while (true) {
      const idx = lower.indexOf(kwLower, start);
      if (idx === -1) break;
      count += 1.0;
      start = idx + kwLower.length;
    }
  }
  return count;
}

export function buildContextPack(params: {
  eventDescription: string;
  emotion?: string | null;
  actionTaken?: string | null;
  result?: string | null;
  tags: string[];
  memories: Memory[];
  photos: Photo[];
  tasks: Task[];
  summaries: Summary[];
}): ContextPack {
  const { eventDescription, emotion, actionTaken, result, tags, memories, photos, tasks, summaries } = params;
  const now = new Date();

  const combinedTextParts = [eventDescription];
  if (emotion) combinedTextParts.push(emotion);
  if (actionTaken) combinedTextParts.push(actionTaken);
  if (result) combinedTextParts.push(result);
  const combinedText = combinedTextParts.join(' ');
  const keywords = extractKeywords(combinedText);

  function computeScore(recordTags: string[], text: string, date: string | Date): number {
    const tagIntersection = tags.filter((t) => recordTags.includes(t)).length;
    const tagScore = 3.0 * tagIntersection;
    const kwHits = countKeywordHits(text, keywords);
    const kwScore = 2.0 * kwHits;
    const tScore = timeScore(now, date);
    return tagScore + kwScore + tScore;
  }

  // Memories
  const memScores: { score: number; memory: Memory }[] = [];
  for (const m of memories) {
    const text = `${m.content} ${m.aiSummary || ''}`.trim();
    const score = computeScore(m.tags, text, m.createdAt);
    if (score > 0) {
      memScores.push({ score, memory: m });
    }
  }
  memScores.sort((a, b) => b.score - a.score);
  const memItems: ContextItem[] = memScores.slice(0, 5).map(({ memory: m }) => ({
    id: m.id,
    type: 'memory',
    titleOrSummary: m.title?.trim() || (m.content.length <= 20 ? m.content : m.content.substring(0, 20)),
    date: m.createdAt,
    tags: m.tags,
  }));

  // Photos (only confirmed)
  const photoScores: { score: number; photo: Photo }[] = [];
  for (const p of photos) {
    if (!p.summaryConfirmed) continue;
    const text = p.aiSummary || '';
    const score = computeScore(p.tags, text, p.takenAt);
    if (score > 0) {
      photoScores.push({ score, photo: p });
    }
  }
  photoScores.sort((a, b) => b.score - a.score);
  const photoItems: ContextItem[] = photoScores.slice(0, 5).map(({ photo: p }) => ({
    id: p.id,
    type: 'photo',
    titleOrSummary: p.aiSummary?.trim() || p.locationName || '照片记录',
    date: p.takenAt,
    tags: p.tags,
  }));

  // Tasks
  const taskScores: { score: number; task: Task }[] = [];
  for (const t of tasks) {
    const text = `${t.title} ${t.description || ''}`.trim();
    const score = computeScore([], text, t.createdAt);
    if (score > 0) {
      taskScores.push({ score, task: t });
    }
  }
  taskScores.sort((a, b) => b.score - a.score);
  const taskItems: ContextItem[] = taskScores.slice(0, 5).map(({ task: t }) => ({
    id: t.id,
    type: 'task',
    titleOrSummary: t.title,
    date: t.createdAt,
    tags: [],
  }));

  // Summaries
  const sumScores: { score: number; summary: Summary }[] = [];
  for (const s of summaries) {
    const themeNames = s.themes?.map((th) => th.name) || [];
    const text = `${s.content} ${themeNames.join(' ')} ${s.highlights?.join(' ') || ''}`.trim();
    const score = computeScore(themeNames, text, s.periodStart);
    if (score > 0) {
      sumScores.push({ score, summary: s });
    }
  }
  sumScores.sort((a, b) => b.score - a.score);
  const summaryItems: ContextItem[] = sumScores.slice(0, 5).map(({ summary: s }) => {
    const themeNames = s.themes?.map((th) => th.name) || [];
    const title = s.content?.trim()
      ? (s.content.length <= 20 ? s.content : s.content.substring(0, 20))
      : (themeNames.join('、') || `${s.type}度总结`);
    return {
      id: s.id,
      type: 'summary',
      titleOrSummary: title,
      date: s.periodStart,
      tags: themeNames,
    };
  });

  return {
    memories: memItems,
    photos: photoItems,
    tasks: taskItems,
    summaries: summaryItems,
  };
}
