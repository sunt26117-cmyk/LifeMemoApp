// src/services/storage.ts
import {
  AppTheme,
  CheckInRecord,
  CheckInType,
  DeletedRecord,
  Memory,
  Note,
  Photo,
  Reflection,
  Summary,
  SummaryType,
  Task,
  ThemeItem,
  Trend,
} from '../types';
import {
  initialCheckInRecords,
  initialCheckInTypes,
  initialMemories,
  initialNotes,
  initialPhotos,
  initialReflections,
  initialSummaries,
  initialTasks,
  initialThemes,
  initialTrends,
} from './mockData';
import { supabaseService } from './supabaseService';
import { ensureUuid } from '../utils/uuidUtil';
import { formatLocalDate } from '../utils/dateUtil';
import { isHabitTimeExpired } from '../utils/habitScheduleUtil';
import { computeStepsTimeline } from '../utils/taskTimeUtil';

export function getPeriodKey(
  type: SummaryType | 'week' | 'month' | 'year',
  date: Date = new Date()
): string {
  const y = date.getFullYear();
  if (type === '年' || type === 'year') return `${y}`;
  if (type === '月' || type === 'month') {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  // 周 (ISO Week)
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNr = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${y}-W${String(weekNr).padStart(2, '0')}`;
}

const STORAGE_KEYS = {
  MEMORIES: 'ai_recorder_memories',
  PHOTOS: 'ai_recorder_photos',
  NOTES: 'ai_recorder_notes',
  TASKS: 'ai_recorder_tasks',
  REFLECTIONS: 'ai_recorder_reflections',
  CHECKIN_TYPES: 'ai_recorder_checkin_types',
  CHECKIN_RECORDS: 'ai_recorder_checkin_records',
  TRENDS: 'ai_recorder_trends',
  THEMES: 'ai_recorder_themes',
  SUMMARIES: 'ai_recorder_summaries',
  API_KEY: 'ai_recorder_api_key',
  BIOMETRIC_PIN: 'ai_recorder_pin',
  STAT_ANCHOR_DATE: 'stat_anchor_date',
  OFFLOADED_IDS: 'ai_recorder_offloaded_ids',
  LAST_RECONCILE_TIME: 'last_reconcile_time',
  TASK_CATEGORIES: 'ai_recorder_task_categories',
  APP_THEME: 'ai_recorder_app_theme',
  DELETED_RECORDS: 'ai_recorder_deleted_records',
  CLEANUP_V2: 'ai_recorder_cleaned_v2',
  CLEANUP_TEMPLATE_PURGE: 'ai_recorder_cleaned_template_purge_v3',
};

export const isTemplateId = (id?: string | null): boolean => {
  if (!id) return false;
  return /^(mem|photo|note|task|ref)-\d+$/.test(id);
};

export const DEFAULT_TASK_CATEGORIES: string[] = [
  '生活日常',
  '健康作息',
  '个人学习',
  '情绪觉察',
  '休闲放松',
  '人际沟通',
  '项目工作',
  '个人财务',
];

// 启动时自动彻底清空所有模板内容、打卡、趋势与周期总结，并将今日设为第一天起始锚点
try {
  if (typeof window !== 'undefined') {
    const isPurged = localStorage.getItem(STORAGE_KEYS.CLEANUP_TEMPLATE_PURGE) === 'true';
    if (!isPurged) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      localStorage.setItem(STORAGE_KEYS.STAT_ANCHOR_DATE, today.toISOString());

      const purgeArray = (key: string) => {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return;
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const filtered = list.filter((item: any) => item?.id && !isTemplateId(item.id));
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        } catch (_) {}
      };

      purgeArray(STORAGE_KEYS.MEMORIES);
      purgeArray(STORAGE_KEYS.PHOTOS);
      purgeArray(STORAGE_KEYS.NOTES);
      purgeArray(STORAGE_KEYS.TASKS);
      purgeArray(STORAGE_KEYS.REFLECTIONS);

      // 清空之前由模板内容计入的打卡记录、趋势、主题和周期总结
      localStorage.setItem(STORAGE_KEYS.CHECKIN_RECORDS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.TRENDS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.THEMES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CLEANUP_TEMPLATE_PURGE, 'true');
    }
  }
} catch (_) {}


function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key } }));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

export class AppStorage {
  // Memories
  static getMemories(): Memory[] {
    const list = getLocal<Memory[]>(STORAGE_KEYS.MEMORIES, initialMemories);
    return list.filter((m) => !isTemplateId(m.id));
  }
  static saveMemories(items: Memory[]): void {
    setLocal(STORAGE_KEYS.MEMORIES, items);
  }
  static upsertMemory(item: Memory): void {
    const items = this.getMemories();
    const idx = items.findIndex((m) => m.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.unshift(item);
    }
    this.saveMemories(items);

    // Background sync to Supabase
    supabaseService.syncRecord('memories', 'upsert', item.id, {
      id: ensureUuid(item.id),
      title: item.title || null,
      content: item.content,
      tags: item.tags || [],
      ai_summary: item.aiSummary || null,
      related_media_ids: (item.relatedMediaIds || []).map(ensureUuid),
      created_at: item.createdAt || new Date().toISOString(),
    });
  }
  static deleteMemory(id: string): void {
    const memory = this.getMemories().find((m) => m.id === id);
    const items = this.getMemories().filter((m) => m.id !== id);
    this.saveMemories(items);
    this.recordDeletedRecord('memories', id);
    supabaseService.syncRecord('memories', 'delete', ensureUuid(id));

    // Cascade delete any photos uploaded/associated with this memory
    if (memory) {
      const associatedMediaIds = new Set(memory.relatedMediaIds || []);
      const directPhotos = new Set(memory.photos || []);
      const allPhotos = this.getPhotos();
      const photosToDelete: Photo[] = [];
      const remainingPhotos = allPhotos.filter((p) => {
        const isAssociated =
          associatedMediaIds.has(p.id) ||
          directPhotos.has(p.localPath) ||
          directPhotos.has(p.id) ||
          (p.relatedMemoryIds && p.relatedMemoryIds.includes(id));
        if (isAssociated) {
          photosToDelete.push(p);
          return false;
        }
        return true;
      });

      if (photosToDelete.length > 0) {
        this.savePhotos(remainingPhotos);
        photosToDelete.forEach((p) => {
          this.recordDeletedRecord('photos', p.id);
          supabaseService.syncRecord('photos', 'delete', ensureUuid(p.id));
        });
      }
    }
  }

  // Photos
  static getPhotos(): Photo[] {
    const list = getLocal<Photo[]>(STORAGE_KEYS.PHOTOS, initialPhotos);
    return list.filter((p) => !isTemplateId(p.id));
  }
  static savePhotos(items: Photo[]): void {
    setLocal(STORAGE_KEYS.PHOTOS, items);
  }
  static upsertPhoto(item: Photo): void {
    const items = this.getPhotos();
    const idx = items.findIndex((p) => p.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.unshift(item);
    }
    this.savePhotos(items);

    // Background sync to Supabase
    supabaseService.syncRecord('photos', 'upsert', item.id, {
      id: ensureUuid(item.id),
      local_path: item.localPath,
      taken_at: item.takenAt || new Date().toISOString(),
      ai_summary: item.aiSummary || null,
      summary_confirmed: item.summaryConfirmed ?? false,
      tags: item.tags || [],
      related_memory_ids: (item.relatedMemoryIds || []).map(ensureUuid),
      metadata: {
        locationName: item.locationName || null,
        latitude: item.latitude || null,
        longitude: item.longitude || null,
        ...(item.metadata || {}),
      },
      created_at: item.createdAt || new Date().toISOString(),
    });
  }
  static deletePhoto(id: string): void {
    const items = this.getPhotos().filter((p) => p.id !== id);
    this.savePhotos(items);
    this.recordDeletedRecord('photos', id);
    supabaseService.syncRecord('photos', 'delete', ensureUuid(id));
  }

  // Notes
  static getNotes(): Note[] {
    const list = getLocal<Note[]>(STORAGE_KEYS.NOTES, initialNotes);
    return list.filter((n) => !isTemplateId(n.id));
  }
  static saveNotes(items: Note[]): void {
    setLocal(STORAGE_KEYS.NOTES, items);
  }
  static upsertNote(item: Note): void {
    const items = this.getNotes();
    const idx = items.findIndex((n) => n.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.unshift(item);
    }
    this.saveNotes(items);

    supabaseService.syncRecord('notes', 'upsert', item.id, {
      id: ensureUuid(item.id),
      title: item.title,
      content: item.content,
      ai_organized: item.tags ? JSON.stringify(item.tags) : null,
      ai_status: item.isPinned ? 'pinned' : 'none',
      created_at: item.createdAt || new Date().toISOString(),
      updated_at: item.updatedAt || new Date().toISOString(),
    });
  }
  static deleteNote(id: string): void {
    const items = this.getNotes().filter((n) => n.id !== id);
    this.saveNotes(items);
    this.recordDeletedRecord('notes', id);
    supabaseService.syncRecord('notes', 'delete', ensureUuid(id));
  }

  // Tasks
  static getTasks(): Task[] {
    const list = getLocal<Task[]>(STORAGE_KEYS.TASKS, initialTasks);
    return list
      .filter((t) => !isTemplateId(t.id))
      .map((t) => {
        if (t.steps && t.steps.length > 0) {
          return {
            ...t,
            steps: computeStepsTimeline(t.startTime, t.steps),
          };
        }
        return t;
      });
  }
  static saveTasks(items: Task[]): void {
    setLocal(STORAGE_KEYS.TASKS, items);
  }
  static upsertTask(item: Task): void {
    const items = this.getTasks();
    const idx = items.findIndex((t) => t.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.unshift(item);
    }
    this.saveTasks(items);

    supabaseService.syncRecord('tasks', 'upsert', item.id, {
      id: ensureUuid(item.id),
      title: item.title,
      description: item.description || '',
      category: item.category,
      priority: item.priority,
      start_time: item.startTime || null,
      due_time: item.dueTime || null,
      reminder_time: item.reminderTime || null,
      repeat_rule: item.repeatRule || '无',
      estimated_minutes: item.estimatedMinutes || null,
      status: item.status,
      steps: item.steps || [],
      source_reflection_id: item.sourceReflectionId ? ensureUuid(item.sourceReflectionId) : null,
      feedback: item.feedback || {},
      check_in_type_ids: item.checkInTypeId ? [ensureUuid(item.checkInTypeId)] : [],
      created_at: item.createdAt || new Date().toISOString(),
    });
  }
  static deleteTask(id: string): void {
    const items = this.getTasks().filter((t) => t.id !== id);
    this.saveTasks(items);
    this.recordDeletedRecord('tasks', id);
    supabaseService.syncRecord('tasks', 'delete', ensureUuid(id));
  }

  // Reflections
  static getReflections(): Reflection[] {
    const list = getLocal<Reflection[]>(STORAGE_KEYS.REFLECTIONS, initialReflections);
    return list.filter((r) => !isTemplateId(r.id));
  }
  static saveReflections(items: Reflection[]): void {
    setLocal(STORAGE_KEYS.REFLECTIONS, items);
  }
  static upsertReflection(item: Reflection): void {
    const items = this.getReflections();
    const idx = items.findIndex((r) => r.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.unshift(item);
    }
    this.saveReflections(items);

    supabaseService.syncRecord('reflections', 'upsert', item.id, {
      id: ensureUuid(item.id),
      event_description: item.eventDescription,
      emotion: item.emotion || '平静',
      action_taken: item.actionTaken || null,
      result: item.result || null,
      ai_summary: item.aiSummary || null,
      related_memory_ids: (item.relatedMemoryIds || []).map(ensureUuid),
      related_photo_ids: (item.relatedPhotoIds || []).map(ensureUuid),
      related_task_ids: (item.relatedTaskIds || []).map(ensureUuid),
      related_summary_ids: (item.relatedSummaryIds || []).map(ensureUuid),
      is_user_confirmed: item.isUserConfirmed ?? false,
      created_at: item.createdAt || new Date().toISOString(),
    });
  }
  static deleteReflection(id: string): void {
    const items = this.getReflections().filter((r) => r.id !== id);
    this.saveReflections(items);
    this.recordDeletedRecord('reflections', id);
    supabaseService.syncRecord('reflections', 'delete', ensureUuid(id));
  }

  // CheckInTypes
  static getCheckInTypes(): CheckInType[] {
    const raw = getLocal<CheckInType[]>(STORAGE_KEYS.CHECKIN_TYPES, initialCheckInTypes);
    // Deduplicate by trimmed name to prevent duplicate habit entries
    const seen = new Set<string>();
    const deduplicated: CheckInType[] = [];
    for (const item of raw) {
      const key = (item.name || '').trim();
      if (!key) continue;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push({
          ...item,
          id: ensureUuid(item.id),
        });
      }
    }
    return deduplicated;
  }
  static saveCheckInTypes(items: CheckInType[]): void {
    const seen = new Set<string>();
    const deduplicated: CheckInType[] = [];
    for (const item of items) {
      const key = (item.name || '').trim();
      if (!key) continue;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push({
          ...item,
          id: ensureUuid(item.id),
        });
      }
    }
    setLocal(STORAGE_KEYS.CHECKIN_TYPES, deduplicated);
  }
  static upsertCheckInType(item: CheckInType): void {
    const items = this.getCheckInTypes();
    const idx = items.findIndex((t) => t.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    this.saveCheckInTypes(items);
  }
  static syncCheckInTypeNameAndSymbol(typeId: string, newName: string, newSymbol: string): void {
    const records = this.getCheckInRecords();
    let modified = false;
    const updated = records.map((r) => {
      if (r.typeId === typeId && (r.typeName !== newName || r.symbol !== newSymbol)) {
        modified = true;
        return { ...r, typeName: newName, symbol: newSymbol };
      }
      return r;
    });
    if (modified) {
      this.saveCheckInRecords(updated);
    }
  }

  // CheckInRecords
  static getCheckInRecords(): CheckInRecord[] {
    return getLocal<CheckInRecord[]>(STORAGE_KEYS.CHECKIN_RECORDS, initialCheckInRecords);
  }
  static saveCheckInRecords(items: CheckInRecord[]): void {
    setLocal(STORAGE_KEYS.CHECKIN_RECORDS, items);
  }
  static getRecordsByDate(date: string): CheckInRecord[] {
    const records = this.getCheckInRecords();
    return records.filter((r) => r.date === date);
  }
  static toggleCheckIn(
    date: string,
    type: CheckInType,
    mode: 'overwrite' | 'toggle' = 'overwrite'
  ): { status: 'created' | 'updated' | 'removed' | 'rejected'; record: CheckInRecord | null; previousTime?: string } {
    const todayStr = formatLocalDate();
    // 黄金规则与用户明确要求：除今天外，历史日期与未来日期均禁止打卡或改动
    if (date !== todayStr) {
      return { status: 'rejected', record: null };
    }

    const items = this.getCheckInRecords();
    const existingIdx = items.findIndex((r) => r.date === date && r.typeId === type.id);
    const now = new Date();

    // 用户明确要求：如果超过了当天设定的最晚时间，超过之后就禁止当天打卡这个习惯
    if (existingIdx < 0 && isHabitTimeExpired(type, date, false, now)) {
      return { status: 'rejected', record: null };
    }
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hh}:${mm}`;
    const currentIso = now.toISOString();

    if (existingIdx >= 0) {
      if (mode === 'toggle') {
        // remove
        const removed = items.splice(existingIdx, 1)[0];
        this.saveCheckInRecords(items);
        if (removed) {
          supabaseService.syncRecord('check_in_records', 'delete', ensureUuid(removed.id));
        }
        return { status: 'removed', record: null };
      } else {
        // 重复打卡：覆盖更新最新时间点，并记录历史打卡时间
        const oldRecord = items[existingIdx];
        const prevTime = oldRecord.checkInTime || oldRecord.createdAt?.slice(11, 16) || '';
        const prevList = [...(oldRecord.previousCheckIns || [])];
        if (prevTime && !prevList.includes(prevTime)) {
          prevList.push(prevTime);
        }

        const updatedRecord: CheckInRecord = {
          ...oldRecord,
          typeName: type.name,
          symbol: type.symbol,
          checkInTime: currentTimeStr,
          checkedAt: currentIso,
          previousCheckIns: prevList,
        };

        items[existingIdx] = updatedRecord;
        this.saveCheckInRecords(items);
        supabaseService.syncRecord('check_in_records', 'upsert', updatedRecord.id, {
          id: updatedRecord.id,
          date: updatedRecord.date,
          type_id: ensureUuid(updatedRecord.typeId),
          symbol_snapshot: updatedRecord.symbol,
          label_snapshot: updatedRecord.typeName,
          created_at: updatedRecord.createdAt,
        });
        return { status: 'updated', record: updatedRecord, previousTime: prevTime };
      }
    } else {
      // 新增打卡：精确记录当前打卡时间点
      const newRecord: CheckInRecord = {
        id: ensureUuid(),
        date,
        typeId: type.id,
        typeName: type.name,
        symbol: type.symbol,
        createdAt: currentIso,
        checkInTime: currentTimeStr,
        checkedAt: currentIso,
        previousCheckIns: [],
      };
      items.push(newRecord);
      this.saveCheckInRecords(items);
      supabaseService.syncRecord('check_in_records', 'upsert', newRecord.id, {
        id: newRecord.id,
        date: newRecord.date,
        type_id: ensureUuid(newRecord.typeId),
        symbol_snapshot: newRecord.symbol,
        label_snapshot: newRecord.typeName,
        created_at: newRecord.createdAt,
      });
      return { status: 'created', record: newRecord };
    }
  }

  // Trends & Themes
  static getTrends(): Trend[] {
    const list = getLocal<Trend[]>(STORAGE_KEYS.TRENDS, initialTrends);
    return list
      .map((tr) => ({
        ...tr,
        evidence: (tr.evidence || []).filter((ev) => !isTemplateId(ev.taskId)),
      }))
      .filter((tr) => tr.evidence.length > 0);
  }
  static saveTrends(items: Trend[]): void {
    setLocal(STORAGE_KEYS.TRENDS, items);
  }

  static getThemes(): ThemeItem[] {
    const list = getLocal<ThemeItem[]>(STORAGE_KEYS.THEMES, initialThemes);
    return list.filter((th) => th.weight > 0 && th.trendNames && th.trendNames.length > 0);
  }
  static saveThemes(items: ThemeItem[]): void {
    setLocal(STORAGE_KEYS.THEMES, items);
  }

// Summaries
  static getSummaries(): Summary[] {
    const items = getLocal<Summary[]>(STORAGE_KEYS.SUMMARIES, initialSummaries);
    let changed = false;
    const now = new Date();
    const updated = items.map((item) => {
      if (!item.periodKey) {
        item.periodKey = getPeriodKey(item.type, new Date(item.periodStart || item.createdAt));
        changed = true;
      }
      const currentPeriod = getPeriodKey(item.type, now);
      if (item.periodKey !== currentPeriod && !item.isFrozen) {
        item.isFrozen = true;
        changed = true;
      }
      return item;
    });
    if (changed) {
      setLocal(STORAGE_KEYS.SUMMARIES, updated);
    }
    return updated;
  }

  static saveSummaries(items: Summary[]): void {
    setLocal(STORAGE_KEYS.SUMMARIES, items);
  }

  static upsertSummary(item: Summary): { success: boolean; summary: Summary; message?: string } {
    const items = this.getSummaries();
    const currentPeriod = getPeriodKey(item.type, new Date());
    if (!item.periodKey) {
      item.periodKey = currentPeriod;
    }

    const existingIdx = items.findIndex(
      (s) => (s.id === item.id) || (s.periodKey === item.periodKey && s.type === item.type)
    );

    if (existingIdx >= 0) {
      const existing = items[existingIdx];
      if (existing.isFrozen) {
        return { success: false, summary: existing, message: '历史总结已封印归档，禁止被新周期覆盖或重新刷新' };
      }
      const updated: Summary = {
        ...existing,
        content: item.content,
        themes: item.themes || existing.themes,
        highlights: item.highlights || existing.highlights,
        taskSuggestions: item.taskSuggestions || existing.taskSuggestions,
        annualData: item.annualData || existing.annualData,
        version: (existing.version || 1) + 1,
        updatedAt: new Date().toISOString(),
        isFrozen: false,
      };
      items[existingIdx] = updated;
      this.saveSummaries(items);
      supabaseService.syncRecord('summaries', 'upsert', updated.id, {
        id: updated.id,
        type: updated.type,
        period_start: updated.periodStart,
        period_end: updated.periodEnd,
        period_key: updated.periodKey,
        is_frozen: false,
        version: updated.version,
        content: updated.content,
        themes: updated.themes,
        highlights: updated.highlights,
        task_suggestions: updated.taskSuggestions,
        annual_data: updated.annualData,
        created_at: updated.createdAt,
      });
      return { success: true, summary: updated };
    } else {
      const newSummary: Summary = {
        ...item,
        version: 1,
        isFrozen: false,
        updatedAt: new Date().toISOString(),
      };
      items.unshift(newSummary);
      this.saveSummaries(items);
      supabaseService.syncRecord('summaries', 'upsert', newSummary.id, {
        id: newSummary.id,
        type: newSummary.type,
        period_start: newSummary.periodStart,
        period_end: newSummary.periodEnd,
        period_key: newSummary.periodKey,
        is_frozen: false,
        version: 1,
        content: newSummary.content,
        themes: newSummary.themes,
        highlights: newSummary.highlights,
        task_suggestions: newSummary.taskSuggestions,
        annual_data: newSummary.annualData,
        created_at: newSummary.createdAt,
      });
      return { success: true, summary: newSummary };
    }
  }

  // Statistics Anchor Date (模块 1)
  static getStatAnchorDate(): string | null {
    return localStorage.getItem(STORAGE_KEYS.STAT_ANCHOR_DATE);
  }

  static setStatAnchorDate(date: string | null): void {
    if (date) {
      localStorage.setItem(STORAGE_KEYS.STAT_ANCHOR_DATE, date);
    } else {
      localStorage.removeItem(STORAGE_KEYS.STAT_ANCHOR_DATE);
    }
    window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key: 'STAT_ANCHOR_DATE' } }));
  }

  static resetCheckInsAndTrends(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const anchorIso = today.toISOString();
    this.setStatAnchorDate(anchorIso);
    this.saveCheckInRecords([]);
    this.saveTrends([]);
    this.saveThemes([]);
    this.saveSummaries([]);
    window.dispatchEvent(
      new CustomEvent('app_storage_updated', { detail: { key: 'RESET_CHECKIN_TRENDS' } })
    );
  }

  // Dynamic Task Categories
  static getTaskCategories(): string[] {
    const raw = getLocal<string[]>(STORAGE_KEYS.TASK_CATEGORIES, DEFAULT_TASK_CATEGORIES);
    const filtered = raw.filter((c) => c !== '习惯' && c !== '习惯打卡');
    if (filtered.length !== raw.length) {
      this.saveTaskCategories(filtered);
    }
    return filtered.length > 0 ? filtered : DEFAULT_TASK_CATEGORIES;
  }

  static saveTaskCategories(categories: string[]): void {
    setLocal(STORAGE_KEYS.TASK_CATEGORIES, categories);
  }

  static addTaskCategory(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const current = this.getTaskCategories();
    if (current.includes(trimmed)) return false;
    this.saveTaskCategories([...current, trimmed]);
    return true;
  }

  static deleteTaskCategory(name: string): void {
    const current = this.getTaskCategories();
    const updated = current.filter((c) => c !== name);
    this.saveTaskCategories(updated.length > 0 ? updated : ['日常']);
  }

  static resetTaskCategories(): void {
    this.saveTaskCategories(DEFAULT_TASK_CATEGORIES);
  }

  // App Theme ('sky' | 'warm' | 'forest')
  static getAppTheme(): AppTheme {
    const stored = localStorage.getItem(STORAGE_KEYS.APP_THEME);
    if (stored === 'sky' || stored === 'warm' || stored === 'forest') {
      return stored as AppTheme;
    }
    if (stored === 'night') {
      return 'forest';
    }
    return 'sky';
  }

  static setAppTheme(theme: AppTheme): void {
    localStorage.setItem(STORAGE_KEYS.APP_THEME, theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key: 'APP_THEME' } }));
  }


  // Offloaded IDs & Dual-track Deletion (模块 3)
  static getOffloadedIds(): string[] {
    return getLocal<string[]>(STORAGE_KEYS.OFFLOADED_IDS, []);
  }

  static addOffloadedId(id: string): void {
    const ids = this.getOffloadedIds();
    if (!ids.includes(id)) {
      ids.push(id);
      setLocal(STORAGE_KEYS.OFFLOADED_IDS, ids);
    }
  }

  static removeOffloadedId(id: string): void {
    const ids = this.getOffloadedIds().filter((i) => i !== id);
    setLocal(STORAGE_KEYS.OFFLOADED_IDS, ids);
  }

  static isOffloaded(id: string): boolean {
    return this.getOffloadedIds().includes(id);
  }

  // 48-Hour Reconcile (模块 4)
  static getLastReconcileTime(): number {
    const val = localStorage.getItem(STORAGE_KEYS.LAST_RECONCILE_TIME);
    return val ? parseInt(val, 10) : 0;
  }

  static setLastReconcileTime(time: number): void {
    localStorage.setItem(STORAGE_KEYS.LAST_RECONCILE_TIME, String(time));
  }

  // Deleted Records Tracking (防止云端拉取时误复活已删除数据)
  static getDeletedRecords(): DeletedRecord[] {
    return getLocal<DeletedRecord[]>(STORAGE_KEYS.DELETED_RECORDS, []);
  }

  static getDeletedIdSet(): Set<string> {
    const list = this.getDeletedRecords();
    return new Set(list.map((r) => r.id));
  }

  static recordDeletedRecord(
    collection: 'memories' | 'photos' | 'notes' | 'tasks' | 'reflections' | 'summaries' | 'check_in_records',
    id: string
  ): void {
    const safeId = ensureUuid(id);
    const list = this.getDeletedRecords();
    if (!list.some((r) => r.id === safeId)) {
      list.push({
        id: safeId,
        collection,
        deletedAt: new Date().toISOString(),
      });
      setLocal(STORAGE_KEYS.DELETED_RECORDS, list);
    }
  }

  static removeDeletedRecord(id: string): void {
    const safeId = ensureUuid(id);
    const list = this.getDeletedRecords().filter((r) => r.id !== safeId);
    setLocal(STORAGE_KEYS.DELETED_RECORDS, list);
  }

  static removeDeletedRecords(ids: string[]): void {
    const idSet = new Set(ids.map(ensureUuid));
    const list = this.getDeletedRecords().filter((r) => !idSet.has(r.id));
    setLocal(STORAGE_KEYS.DELETED_RECORDS, list);
  }

  static clearDeletedRecords(): void {
    setLocal(STORAGE_KEYS.DELETED_RECORDS, []);
  }

  // Dual-Track Operations: Offload vs Permanent Delete
  static offloadItem(collection: 'memories' | 'photos' | 'notes' | 'tasks' | 'reflections' | 'summaries', id: string): void {
    this.addOffloadedId(id);
    switch (collection) {
      case 'memories': {
        const targetMem = this.getMemories().find((m) => m.id === id);
        const list = this.getMemories().filter((m) => m.id !== id);
        this.saveMemories(list);
        if (targetMem) {
          const associatedMediaIds = new Set(targetMem.relatedMediaIds || []);
          const directPhotos = new Set(targetMem.photos || []);
          this.getPhotos().forEach((p) => {
            if (
              associatedMediaIds.has(p.id) ||
              directPhotos.has(p.localPath) ||
              directPhotos.has(p.id) ||
              (p.relatedMemoryIds && p.relatedMemoryIds.includes(id))
            ) {
              this.offloadItem('photos', p.id);
            }
          });
        }
        break;
      }
      case 'photos': {
        const list = this.getPhotos().filter((p) => p.id !== id);
        this.savePhotos(list);
        break;
      }
      case 'notes': {
        const list = this.getNotes().filter((n) => n.id !== id);
        this.saveNotes(list);
        break;
      }
      case 'tasks': {
        const list = this.getTasks().filter((t) => t.id !== id);
        this.saveTasks(list);
        break;
      }
      case 'reflections': {
        const list = this.getReflections().filter((r) => r.id !== id);
        this.saveReflections(list);
        break;
      }
      case 'summaries': {
        const list = this.getSummaries().filter((s) => s.id !== id);
        this.saveSummaries(list);
        break;
      }
    }
    // 严禁向云端发送 DELETE 请求；仅标记云端 local_storage_status 为 offloaded
    supabaseService.syncRecord(collection, 'upsert', id, {
      local_storage_status: 'offloaded',
      is_deleted: false,
    });
  }

  static permanentDeleteItem(collection: 'memories' | 'photos' | 'notes' | 'tasks' | 'reflections' | 'summaries', id: string): void {
    this.removeOffloadedId(id);
    switch (collection) {
      case 'memories': {
        const targetMem = this.getMemories().find((m) => m.id === id);
        const list = this.getMemories().filter((m) => m.id !== id);
        this.saveMemories(list);
        if (targetMem) {
          const associatedMediaIds = new Set(targetMem.relatedMediaIds || []);
          const directPhotos = new Set(targetMem.photos || []);
          this.getPhotos().forEach((p) => {
            if (
              associatedMediaIds.has(p.id) ||
              directPhotos.has(p.localPath) ||
              directPhotos.has(p.id) ||
              (p.relatedMemoryIds && p.relatedMemoryIds.includes(id))
            ) {
              this.permanentDeleteItem('photos', p.id);
            }
          });
        }
        break;
      }
      case 'photos': {
        const list = this.getPhotos().filter((p) => p.id !== id);
        this.savePhotos(list);
        break;
      }
      case 'notes': {
        const list = this.getNotes().filter((n) => n.id !== id);
        this.saveNotes(list);
        break;
      }
      case 'tasks': {
        const list = this.getTasks().filter((t) => t.id !== id);
        this.saveTasks(list);
        break;
      }
      case 'reflections': {
        const list = this.getReflections().filter((r) => r.id !== id);
        this.saveReflections(list);
        break;
      }
      case 'summaries': {
        const list = this.getSummaries().filter((s) => s.id !== id);
        this.saveSummaries(list);
        break;
      }
    }
    // 记录到已删除集合并彻底从云端数据库物理删除，杜绝再次拉取时死灰复燃
    this.recordDeletedRecord(collection, id);
    supabaseService.syncRecord(collection, 'delete', ensureUuid(id));
  }

  static restoreItem(collection: 'memories' | 'photos' | 'notes' | 'tasks' | 'reflections' | 'summaries', item: any): void {
    this.removeOffloadedId(item.id);
    item.localStorageStatus = 'downloaded';
    item.isDeleted = false;
    switch (collection) {
      case 'memories': {
        const list = this.getMemories().filter((m) => m.id !== item.id);
        list.unshift(item);
        this.saveMemories(list);
        break;
      }
      case 'photos': {
        const list = this.getPhotos().filter((p) => p.id !== item.id);
        list.unshift(item);
        this.savePhotos(list);
        break;
      }
      case 'notes': {
        const list = this.getNotes().filter((n) => n.id !== item.id);
        list.unshift(item);
        this.saveNotes(list);
        break;
      }
      case 'tasks': {
        const list = this.getTasks().filter((t) => t.id !== item.id);
        list.unshift(item);
        this.saveTasks(list);
        break;
      }
      case 'reflections': {
        const list = this.getReflections().filter((r) => r.id !== item.id);
        list.unshift(item);
        this.saveReflections(list);
        break;
      }
      case 'summaries': {
        const list = this.getSummaries().filter((s) => s.id !== item.id);
        list.unshift(item);
        this.saveSummaries(list);
        break;
      }
    }
    supabaseService.syncRecord(collection, 'upsert', item.id, {
      local_storage_status: 'downloaded',
      is_deleted: false,
    });
  }

  // KeyStore
  static getApiKey(): string | null {
    const stored = localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (stored && stored.trim()) return stored.trim();
    try {
      if (
        typeof import.meta !== 'undefined' &&
        import.meta.env &&
        import.meta.env.VITE_AI_API_KEY
      ) {
        return (import.meta.env.VITE_AI_API_KEY as string).trim();
      }
    } catch (_) {}
    return null;
  }
  static setApiKey(key: string): void {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
  }

  // Biometric / PIN Lock
  static getPin(): string | null {
    return localStorage.getItem(STORAGE_KEYS.BIOMETRIC_PIN) || null;
  }
  static setPin(pin: string | null): void {
    if (pin) {
      localStorage.setItem(STORAGE_KEYS.BIOMETRIC_PIN, pin);
    } else {
      localStorage.removeItem(STORAGE_KEYS.BIOMETRIC_PIN);
    }
  }

  // Reset to default
  static resetAll(): void {
    localStorage.clear();
    this.saveMemories(initialMemories);
    this.savePhotos(initialPhotos);
    this.saveNotes(initialNotes);
    this.saveTasks(initialTasks);
    this.saveReflections(initialReflections);
    this.saveCheckInTypes(initialCheckInTypes);
    this.saveCheckInRecords(initialCheckInRecords);
    this.saveTrends(initialTrends);
    this.saveThemes(initialThemes);
    this.saveSummaries(initialSummaries);
    window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key: 'ALL' } }));
  }
}
