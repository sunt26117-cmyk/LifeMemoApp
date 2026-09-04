// src/services/trendEngine.ts
import { v4 as uuidv4 } from 'uuid';
import {
  CancelType,
  DelayType,
  EvidenceItem,
  ThemeDirection,
  ThemeItem,
  Trend,
  TrendDirection,
} from '../types';

export interface TaskTransitionEvent {
  eventId: string;
  taskId: string;
  taskTitle?: string;
  categoryValue?: string;
  event: 'completed' | 'delayed' | 'cancelled' | string;
  delta: number;
  time: string;
  delayType?: DelayType | null;
  cancelType?: CancelType | null;
  behaviorImprovement?: string[];
}

export function computeEventDelta(ev: TaskTransitionEvent): number {
  if (ev.event === 'completed') {
    return -1;
  }
  if (ev.event === 'delayed') {
    if (ev.delayType === '外部') return 0.5;
    if (ev.delayType === '内部') return 1.0;
    if (ev.delayType === '逃避') return 2.0;
    return 0;
  }
  if (ev.event === 'cancelled') {
    if (ev.cancelType === '主动') return 0.0;
    if (ev.cancelType === '被动') return 1.0;
    if (ev.cancelType === '逃避') return 2.0;
    return 0;
  }
  return ev.delta ?? 0;
}

const WINDOW_30_DAYS = 30 * 24 * 60 * 60 * 1000;
const WINDOW_90_DAYS = 90 * 24 * 60 * 60 * 1000;
const EVIDENCE_LIMIT = 50;

export function sumRecentDelta(evidence: EvidenceItem[], now: Date, windowMs: number): number {
  const cutoff = now.getTime() - windowMs;
  let sum = 0;
  for (const e of evidence) {
    const t = new Date(e.time).getTime();
    if (t >= cutoff) {
      sum += e.delta;
    }
  }
  return sum;
}

export function countRecent(evidence: EvidenceItem[], now: Date, windowMs: number): number {
  const cutoff = now.getTime() - windowMs;
  let count = 0;
  for (const e of evidence) {
    const t = new Date(e.time).getTime();
    if (t >= cutoff) {
      count++;
    }
  }
  return count;
}

export function processTaskEvent(
  ev: TaskTransitionEvent,
  existingTrends: Trend[],
  existingThemes: ThemeItem[]
): { updatedTrends: Trend[]; updatedThemes: ThemeItem[] } {
  const delta = computeEventDelta(ev);
  const category = ev.categoryValue || '未分类';
  const trendName = ev.taskTitle?.trim() || category;

  const now = new Date();
  const trends = [...existingTrends];
  let trendIndex = trends.findIndex((t) => t.trendName === trendName);

  let trend: Trend;
  if (trendIndex >= 0) {
    trend = { ...trends[trendIndex] };
  } else {
    trend = {
      id: uuidv4(),
      trendName,
      category,
      score: 0,
      direction: '稳定',
      weight: 0,
      evidence: [],
      cluster: category,
      updatedAt: now.toISOString(),
    };
  }

  // Idempotency: skip if eventId already recorded
  if (trend.evidence.some((e) => e.eventId === ev.eventId)) {
    return { updatedTrends: trends, updatedThemes: existingThemes };
  }

  const newEvidence: EvidenceItem[] = [
    {
      eventId: ev.eventId,
      taskId: ev.taskId,
      event: ev.event,
      delta,
      time: ev.time || now.toISOString(),
      category,
      behaviorImprovement: ev.behaviorImprovement,
    },
    ...trend.evidence,
  ].slice(0, EVIDENCE_LIMIT);

  const newScore = trend.score + delta;
  const recent30Sum = sumRecentDelta(newEvidence, now, WINDOW_30_DAYS);
  const recent90Count = countRecent(newEvidence, now, WINDOW_90_DAYS);
  const newWeight = recent90Count * Math.abs(newScore);
  const newDirection: TrendDirection =
    recent30Sum < 0 ? '改善' : recent30Sum > 0 ? '恶化' : '稳定';

  trend = {
    ...trend,
    score: newScore,
    direction: newDirection,
    weight: newWeight,
    evidence: newEvidence,
    updatedAt: now.toISOString(),
  };

  if (trendIndex >= 0) {
    trends[trendIndex] = trend;
  } else {
    trends.push(trend);
  }

  // Recompute Theme
  const categoryTrends = trends.filter((t) => t.category === category);
  let totalWeight = 0;
  let weightedScoreSum = 0;
  const mergedEvidence: EvidenceItem[] = [];
  const trendNames: string[] = [];

  for (const t of categoryTrends) {
    totalWeight += t.weight;
    const r30 = sumRecentDelta(t.evidence, now, WINDOW_30_DAYS);
    weightedScoreSum += r30 * t.weight;
    mergedEvidence.push(...t.evidence);
    trendNames.push(t.trendName);
  }

  const themeScore = totalWeight === 0 ? 0 : weightedScoreSum / totalWeight;
  const themeDirection: ThemeDirection =
    themeScore < 0 ? '改善' : themeScore > 0 ? '恶化' : '稳定';

  mergedEvidence.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const limitedThemeEvidence = mergedEvidence.slice(0, EVIDENCE_LIMIT);

  const themes = [...existingThemes];
  const themeIdx = themes.findIndex((th) => th.themeName === category);

  const updatedTheme: ThemeItem = {
    id: themeIdx >= 0 ? themes[themeIdx].id : uuidv4(),
    themeName: category,
    weight: totalWeight,
    direction: themeDirection,
    evidence: limitedThemeEvidence,
    clusterNames: [category],
    trendNames,
    updatedAt: now.toISOString(),
  };

  if (themeIdx >= 0) {
    themes[themeIdx] = updatedTheme;
  } else {
    themes.push(updatedTheme);
  }

  return { updatedTrends: trends, updatedThemes: themes };
}
