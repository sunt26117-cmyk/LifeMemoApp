// src/utils/validator.ts
import { ReflectionSummary, ContextPack } from '../types';

export interface Violation {
  rule: 'V1' | 'V2' | 'V3' | 'V4' | 'V5';
  detail: string;
}

export interface ValidationResult {
  passed: boolean;
  violations: Violation[];
}

export const VERB_WHITELIST = [
  '制定', '列出', '写', '记录', '确认', '设置', '添加', '使用', '建立', '执行',
  '保存', '检查', '创建', '安排', '发送', '准备', '复习', '更新', '关闭', '开启',
];

export const PSYCHOLOGICAL_BLACKLIST = [
  '内在', '自我接纳', '安全感', '原生家庭', '潜意识', '疗愈', '情绪疏导', '心理',
];

export const PERSONALITY_BLACKLIST = [
  '性格', '人格', '你就是', '你总是', '你从来', '拖延型', '内向的人',
];

export const INFERENCE_MARKERS = [
  '可能因为', '也许是你', '你其实', '你应该感到',
];

export function validate(s: ReflectionSummary, c: ContextPack): ValidationResult {
  const violations: Violation[] = [];

  // V1: 6 text fields non-empty
  const requiredFields: Record<string, string | undefined | null> = {
    eventSummary: s.eventSummary,
    goodPoints: s.goodPoints,
    ignoredFactors: s.ignoredFactors,
    improvementPoints: s.improvementPoints,
    nextSuggestion: s.nextSuggestion,
  };

  for (const [name, val] of Object.entries(requiredFields)) {
    if (!val || val.trim().length === 0) {
      violations.push({
        rule: 'V1',
        detail: `字段 ${name} 不能为空或仅包含空白。`,
      });
    }
  }

  // V2: Blacklist
  const blacklist = [...PSYCHOLOGICAL_BLACKLIST, ...PERSONALITY_BLACKLIST];
  const aiFields: [string, string | null | undefined][] = [
    ['eventSummary', s.eventSummary],
    ['goodPoints', s.goodPoints],
    ['ignoredFactors', s.ignoredFactors],
    ['improvementPoints', s.improvementPoints],
    ['nextSuggestion', s.nextSuggestion],
    ['suggestedTask', s.suggestedTask],
  ];

  for (const [name, text] of aiFields) {
    if (!text) continue;
    for (const word of blacklist) {
      if (text.includes(word)) {
        violations.push({
          rule: 'V2',
          detail: `字段 ${name} 包含黑名单词语："${word}"。`,
        });
      }
    }
  }

  // V3: Citations check
  const memoryIdSet = new Set(c.memories.map((m) => m.id));
  const photoIdSet = new Set(c.photos.map((p) => p.id));
  const citations = s.citations || { memoryIds: [], photoIds: [] };

  for (const memId of citations.memoryIds || []) {
    if (!memoryIdSet.has(memId)) {
      violations.push({
        rule: 'V3',
        detail: `引用的 memoryId 不存在："${memId}"。`,
      });
    }
  }

  for (const photoId of citations.photoIds || []) {
    if (!photoIdSet.has(photoId)) {
      violations.push({
        rule: 'V3',
        detail: `引用的 photoId 不存在："${photoId}"。`,
      });
    }
  }

  // V4: Verb whitelist and minimum length 4
  function startsWithAllowedVerb(text: string): boolean {
    return VERB_WHITELIST.some((v) => text.startsWith(v));
  }

  function checkSuggestionField(name: string, value?: string | null) {
    const trimmed = (value || '').trim();
    if (!trimmed) return;
    if (trimmed.length < 4) {
      violations.push({
        rule: 'V4',
        detail: `字段 ${name} 长度小于 4："${trimmed}"。`,
      });
      return;
    }
    if (!startsWithAllowedVerb(trimmed)) {
      violations.push({
        rule: 'V4',
        detail: `字段 ${name} 未以白名单动词开头："${trimmed}"。`,
      });
    }
  }

  checkSuggestionField('nextSuggestion', s.nextSuggestion);
  checkSuggestionField('suggestedTask', s.suggestedTask);

  // V5: Speculation rejection
  for (const [name, text] of aiFields) {
    if (!text) continue;
    for (const marker of INFERENCE_MARKERS) {
      if (text.includes(marker)) {
        violations.push({
          rule: 'V5',
          detail: `字段 ${name} 包含推断标记 "${marker}"："${text}"。`,
        });
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
