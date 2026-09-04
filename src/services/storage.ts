// src/services/storage.ts
import {
  CheckInRecord,
  CheckInType,
  Memory,
  Note,
  Photo,
  Reflection,
  Summary,
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
};

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
    return getLocal<Memory[]>(STORAGE_KEYS.MEMORIES, initialMemories);
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
  }
  static deleteMemory(id: string): void {
    const items = this.getMemories().filter((m) => m.id !== id);
    this.saveMemories(items);
  }

  // Photos
  static getPhotos(): Photo[] {
    return getLocal<Photo[]>(STORAGE_KEYS.PHOTOS, initialPhotos);
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
  }
  static deletePhoto(id: string): void {
    const items = this.getPhotos().filter((p) => p.id !== id);
    this.savePhotos(items);
  }

  // Notes
  static getNotes(): Note[] {
    return getLocal<Note[]>(STORAGE_KEYS.NOTES, initialNotes);
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
  }
  static deleteNote(id: string): void {
    const items = this.getNotes().filter((n) => n.id !== id);
    this.saveNotes(items);
  }

  // Tasks
  static getTasks(): Task[] {
    return getLocal<Task[]>(STORAGE_KEYS.TASKS, initialTasks);
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
  }
  static deleteTask(id: string): void {
    const items = this.getTasks().filter((t) => t.id !== id);
    this.saveTasks(items);
  }

  // Reflections
  static getReflections(): Reflection[] {
    return getLocal<Reflection[]>(STORAGE_KEYS.REFLECTIONS, initialReflections);
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
  }
  static deleteReflection(id: string): void {
    const items = this.getReflections().filter((r) => r.id !== id);
    this.saveReflections(items);
  }

  // CheckInTypes
  static getCheckInTypes(): CheckInType[] {
    return getLocal<CheckInType[]>(STORAGE_KEYS.CHECKIN_TYPES, initialCheckInTypes);
  }
  static saveCheckInTypes(items: CheckInType[]): void {
    setLocal(STORAGE_KEYS.CHECKIN_TYPES, items);
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

  // CheckInRecords
  static getCheckInRecords(): CheckInRecord[] {
    return getLocal<CheckInRecord[]>(STORAGE_KEYS.CHECKIN_RECORDS, initialCheckInRecords);
  }
  static saveCheckInRecords(items: CheckInRecord[]): void {
    setLocal(STORAGE_KEYS.CHECKIN_RECORDS, items);
  }
  static toggleCheckIn(date: string, type: CheckInType): boolean {
    const items = this.getCheckInRecords();
    const existingIdx = items.findIndex((r) => r.date === date && r.typeId === type.id);
    if (existingIdx >= 0) {
      // remove
      items.splice(existingIdx, 1);
      this.saveCheckInRecords(items);
      return false;
    } else {
      // add
      items.push({
        id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        date,
        typeId: type.id,
        typeName: type.name,
        symbol: type.symbol,
        createdAt: new Date().toISOString(),
      });
      this.saveCheckInRecords(items);
      return true;
    }
  }

  // Trends & Themes
  static getTrends(): Trend[] {
    return getLocal<Trend[]>(STORAGE_KEYS.TRENDS, initialTrends);
  }
  static saveTrends(items: Trend[]): void {
    setLocal(STORAGE_KEYS.TRENDS, items);
  }

  static getThemes(): ThemeItem[] {
    return getLocal<ThemeItem[]>(STORAGE_KEYS.THEMES, initialThemes);
  }
  static saveThemes(items: ThemeItem[]): void {
    setLocal(STORAGE_KEYS.THEMES, items);
  }

  // Summaries
  static getSummaries(): Summary[] {
    return getLocal<Summary[]>(STORAGE_KEYS.SUMMARIES, initialSummaries);
  }
  static saveSummaries(items: Summary[]): void {
    setLocal(STORAGE_KEYS.SUMMARIES, items);
  }
  static upsertSummary(item: Summary): void {
    const items = this.getSummaries();
    const idx = items.findIndex((s) => s.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.unshift(item);
    }
    this.saveSummaries(items);
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
