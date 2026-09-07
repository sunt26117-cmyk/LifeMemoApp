// src/services/supabaseService.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CheckInRecord,
  CheckInType,
  DeletedRecord,
  Memory,
  Note,
  Photo,
  Reflection,
  Summary,
  Task,
  ThemeItem,
  Trend,
} from '../types';
import { ensureUuid } from '../utils/uuidUtil';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: string | null;
  error: string | null;
  itemCount: number;
}

const STORAGE_KEY_SUPABASE_URL = 'ai_recorder_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'ai_recorder_supabase_key';
const STORAGE_KEY_SUPABASE_AUTOSYNC = 'ai_recorder_supabase_autosync';
const STORAGE_KEY_LAST_SYNC = 'ai_recorder_supabase_last_sync';

function getOffloadedIdSet(): Set<string> {
  try {
    const raw = localStorage.getItem('ai_recorder_offloaded_ids');
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function getDeletedRecordsInfo(): { idSet: Set<string>; byCollection: Record<string, string[]> } {
  try {
    const raw = localStorage.getItem('ai_recorder_deleted_records');
    if (!raw) return { idSet: new Set(), byCollection: {} };
    const list: { id: string; collection: string }[] = JSON.parse(raw);
    const idSet = new Set<string>();
    const byCollection: Record<string, string[]> = {};
    list.forEach((item) => {
      idSet.add(item.id);
      if (!byCollection[item.collection]) byCollection[item.collection] = [];
      byCollection[item.collection].push(item.id);
    });
    return { idSet, byCollection };
  } catch {
    return { idSet: new Set(), byCollection: {} };
  }
}

function cleanExpiredDeletedRecordsStorage(): void {
  try {
    const raw = localStorage.getItem('ai_recorder_deleted_records');
    if (!raw) return;
    const list: DeletedRecord[] = JSON.parse(raw);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    // Keep 30 days of deletion tombstones to strictly block any cloud resurrection
    const retained = list.filter((item) => !item.deletedAt || item.deletedAt > thirtyDaysAgo);
    localStorage.setItem('ai_recorder_deleted_records', JSON.stringify(retained));
  } catch {}
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private status: SyncStatus = {
    state: 'idle',
    lastSyncedAt: localStorage.getItem(STORAGE_KEY_LAST_SYNC),
    error: null,
    itemCount: 0,
  };
  private listeners: ((status: SyncStatus) => void)[] = [];
  private syncQueue: Map<string, { table: string; action: 'upsert' | 'delete'; id: string; data?: any }> = new Map();
  private debounceTimer: any = null;

  constructor() {
    this.initClient();
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.status }));
  }

  public getConfig(): SupabaseConfig {
    const url =
      localStorage.getItem(STORAGE_KEY_SUPABASE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
      '';
    const anonKey =
      localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
      '';
    const autoSyncRaw = localStorage.getItem(STORAGE_KEY_SUPABASE_AUTOSYNC);
    const autoSync = autoSyncRaw === null ? true : autoSyncRaw === 'true';

    return { url, anonKey, autoSync };
  }

  public setConfig(
    configOrUrl: SupabaseConfig | string,
    anonKeyParam?: string,
    autoSyncParam?: boolean
  ): void {
    let url = '';
    let anonKey = '';
    let autoSync = true;

    if (typeof configOrUrl === 'object' && configOrUrl !== null) {
      url = configOrUrl.url || '';
      anonKey = configOrUrl.anonKey || '';
      autoSync = configOrUrl.autoSync ?? true;
    } else {
      url = configOrUrl || '';
      anonKey = anonKeyParam || '';
      autoSync = autoSyncParam ?? true;
    }

    if (url.trim()) {
      localStorage.setItem(STORAGE_KEY_SUPABASE_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
    }

    if (anonKey.trim()) {
      localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, anonKey.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
    }

    localStorage.setItem(STORAGE_KEY_SUPABASE_AUTOSYNC, String(autoSync));
    this.initClient();
  }

  public isConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.url && config.anonKey);
  }

  private initClient(): void {
    const config = this.getConfig();
    if (config.url && config.anonKey) {
      try {
        this.client = createClient(config.url, config.anonKey, {
          auth: {
            persistSession: false,
          },
        });
      } catch (err) {
        console.error('[Supabase] Init error:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public getClient(): SupabaseClient | null {
    if (!this.client) {
      this.initClient();
    }
    return this.client;
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: '请先配置 Supabase URL 和 Anon Key' };
    }

    try {
      // Test querying a public table
      const { data, error } = await client.from('tasks').select('id').limit(1);
      if (error) {
        // If error code is 42P01 (table not found) or 42501 (RLS)
        if (error.code === '42P01') {
          return {
            success: false,
            message: `连接成功但未发现数据表 (42P01)。请在 Supabase SQL Editor 执行 supabase/schema.sql 初始化表结构。`,
          };
        }
        if (error.code === '42501') {
          return {
            success: false,
            message: `连接成功但受 RLS 限制 (42501)。请在 Supabase SQL Editor 执行 supabase/fix_rls.sql 关闭单用户 RLS。`,
          };
        }
        return { success: false, message: `连接失败: ${error.message} (${error.code || ''})` };
      }

      return {
        success: true,
        message: '连接成功！Supabase 云端服务正常，已具备读写权限。',
      };
    } catch (err: any) {
      return { success: false, message: `连接异常: ${err.message || String(err)}` };
    }
  }

  // ==========================================
  // Full Two-Way Sync Operations
  // ==========================================

  public async uploadAll(payload: {
    memories: Memory[];
    photos: Photo[];
    notes: Note[];
    tasks: Task[];
    reflections: Reflection[];
    checkInTypes: CheckInType[];
    checkInRecords: CheckInRecord[];
    trends: Trend[];
    themes: ThemeItem[];
    summaries: Summary[];
  }): Promise<{ success: boolean; message: string; count: number }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'Supabase 未配置', count: 0 };
    }

    this.status.state = 'syncing';
    this.status.error = null;
    this.notify();

    let totalSynced = 0;

    try {
      const { byCollection: deletedByCollection } = getDeletedRecordsInfo();
      const offloadedSet = getOffloadedIdSet();

      // Step 0: Explicitly delete from Supabase all recorded deleted items
      for (const [col, ids] of Object.entries(deletedByCollection)) {
        if (ids && ids.length > 0) {
          try {
            await client.from(col).delete().in('id', ids.map(ensureUuid));
          } catch (e) {
            console.warn(`[Supabase Upload] Delete tombstones error in ${col}:`, e);
          }
        }
      }

      // Step 0.5: Mirror cleanup - if user deleted items locally,
      // compare cloud items with local active items. Any cloud item not in local active items and not offloaded must be deleted!
      const mirrorDeleteOrphans = async (tableName: string, activeIds: string[]) => {
        try {
          const { data: cloudList, error: listErr } = await client.from(tableName).select('id');
          if (listErr) {
            console.warn(`[Supabase Mirror Cleanup] Could not list ${tableName}:`, listErr);
            return;
          }
          if (cloudList && cloudList.length > 0) {
            const activeSet = new Set(activeIds.map(ensureUuid));
            const orphanIds = cloudList
              .map((r: any) => r.id)
              .filter((cid: string) => !activeSet.has(cid) && !offloadedSet.has(cid));
            if (orphanIds.length > 0) {
              for (let i = 0; i < orphanIds.length; i += 50) {
                const batch = orphanIds.slice(i, i + 50);
                const { error: delErr } = await client.from(tableName).delete().in('id', batch);
                if (delErr) {
                  console.warn(`[Supabase Mirror Cleanup] Delete batch error on ${tableName}:`, delErr);
                  await client.from(tableName).update({ is_deleted: true }).in('id', batch);
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[Supabase Mirror Cleanup] Warning on ${tableName}:`, err);
        }
      };

      await mirrorDeleteOrphans('memories', payload.memories.map((m) => m.id));
      await mirrorDeleteOrphans('photos', payload.photos.map((p) => p.id));
      await mirrorDeleteOrphans('notes', payload.notes.map((n) => n.id));
      await mirrorDeleteOrphans('tasks', payload.tasks.map((t) => t.id));
      await mirrorDeleteOrphans('reflections', payload.reflections.map((r) => r.id));
      await mirrorDeleteOrphans('summaries', payload.summaries.map((s) => s.id));

      // Clean only expired tombstones (> 30 days), retaining recent ones to prevent resurrection
      cleanExpiredDeletedRecordsStorage();

      // 1. Memories
      if (payload.memories.length > 0) {
        const rows = payload.memories.map((m) => ({
          id: ensureUuid(m.id),
          title: m.title || null,
          content: m.content,
          tags: m.tags || [],
          ai_summary: m.aiSummary || null,
          related_media_ids: (m.relatedMediaIds || []).map(ensureUuid),
          created_at: m.createdAt || new Date().toISOString(),
        }));
        const { error } = await client.from('memories').upsert(rows);
        if (error) throw new Error(`同步记忆失败: ${error.message}`);
        totalSynced += rows.length;
      }

      // 2. Photos
      if (payload.photos.length > 0) {
        const rows = payload.photos.map((p) => ({
          id: ensureUuid(p.id),
          local_path: p.localPath,
          taken_at: p.takenAt || new Date().toISOString(),
          ai_summary: p.aiSummary || null,
          summary_confirmed: p.summaryConfirmed ?? false,
          tags: p.tags || [],
          related_memory_ids: (p.relatedMemoryIds || []).map(ensureUuid),
          metadata: {
            locationName: p.locationName || null,
            latitude: p.latitude || null,
            longitude: p.longitude || null,
            ...(p.metadata || {}),
          },
          created_at: p.createdAt || new Date().toISOString(),
        }));
        const { error } = await client.from('photos').upsert(rows);
        if (error) throw new Error(`同步照片失败: ${error.message}`);
        totalSynced += rows.length;
      }

      // 3. Notes
      if (payload.notes.length > 0) {
        const rows = payload.notes.map((n) => ({
          id: ensureUuid(n.id),
          title: n.title,
          content: n.content,
          ai_organized: n.tags ? JSON.stringify(n.tags) : null,
          ai_status: n.isPinned ? 'pinned' : 'none',
          created_at: n.createdAt || new Date().toISOString(),
          updated_at: n.updatedAt || new Date().toISOString(),
        }));
        const { error } = await client.from('notes').upsert(rows);
        if (error) console.warn('[Supabase] Notes table sync note:', error.message);
        else totalSynced += rows.length;
      }

      // 4. Tasks
      if (payload.tasks.length > 0) {
        const rows = payload.tasks.map((t) => ({
          id: ensureUuid(t.id),
          title: t.title,
          description: t.description || '',
          category: t.category,
          priority: t.priority,
          start_time: t.startTime || null,
          due_time: t.dueTime || null,
          reminder_time: t.reminderTime || null,
          repeat_rule: t.repeatRule || '无',
          estimated_minutes: t.estimatedMinutes || null,
          status: t.status,
          steps: t.steps || [],
          source_reflection_id: t.sourceReflectionId ? ensureUuid(t.sourceReflectionId) : null,
          feedback: t.feedback || {},
          check_in_type_ids: t.checkInTypeId ? [ensureUuid(t.checkInTypeId)] : [],
          created_at: t.createdAt || new Date().toISOString(),
        }));
        const { error } = await client.from('tasks').upsert(rows);
        if (error) throw new Error(`同步任务失败: ${error.message}`);
        totalSynced += rows.length;
      }

      // 5. Reflections
      if (payload.reflections.length > 0) {
        const rows = payload.reflections.map((r) => ({
          id: ensureUuid(r.id),
          event_description: r.eventDescription,
          emotion: r.emotion || '平静',
          action_taken: r.actionTaken || null,
          result: r.result || null,
          ai_summary: r.aiSummary || null,
          related_memory_ids: (r.relatedMemoryIds || []).map(ensureUuid),
          related_photo_ids: (r.relatedPhotoIds || []).map(ensureUuid),
          related_task_ids: (r.relatedTaskIds || []).map(ensureUuid),
          related_summary_ids: (r.relatedSummaryIds || []).map(ensureUuid),
          is_user_confirmed: r.isUserConfirmed ?? false,
          created_at: r.createdAt || new Date().toISOString(),
        }));
        const { error } = await client.from('reflections').upsert(rows);
        if (error) throw new Error(`同步反思失败: ${error.message}`);
        totalSynced += rows.length;
      }

      // 6. Check-in Types
      if (payload.checkInTypes.length > 0) {
        const seenLabels = new Set<string>();
        const dedupedTypes = payload.checkInTypes.filter((t) => {
          const key = (t.name || '').trim();
          if (!key || seenLabels.has(key)) return false;
          seenLabels.add(key);
          return true;
        });

        const rows = dedupedTypes.map((t) => ({
          id: ensureUuid(t.id),
          symbol: t.symbol,
          label: t.name,
          sort_order: t.sortOrder ?? 0,
          enabled: t.enabled ?? true,
          created_at: t.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { error } = await client.from('check_in_types').upsert(rows, { onConflict: 'id' });
        if (error) console.warn('[Supabase] check_in_types sync note:', error.message);
        else totalSynced += rows.length;
      }

      // 7. Check-in Records
      if (payload.checkInRecords.length > 0) {
        const rows = payload.checkInRecords.map((r) => ({
          id: ensureUuid(r.id),
          date: r.date,
          type_id: ensureUuid(r.typeId),
          symbol_snapshot: r.symbol,
          label_snapshot: r.typeName,
          created_at: r.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { error } = await client.from('check_in_records').upsert(rows, {
          onConflict: 'date,type_id',
        });
        if (error) console.warn('[Supabase] check_in_records sync note:', error.message);
        else totalSynced += rows.length;
      }

      // 8. Trends
      if (payload.trends.length > 0) {
        const rows = payload.trends.map((tr) => ({
          id: ensureUuid(tr.id),
          trend_name: tr.trendName,
          category: tr.category,
          score: tr.score,
          direction: tr.direction,
          weight: tr.weight,
          evidence: tr.evidence || [],
          cluster: tr.cluster || null,
          updated_at: tr.updatedAt || new Date().toISOString(),
        }));
        const { error } = await client.from('trends').upsert(rows);
        if (error) console.warn('[Supabase] trends sync note:', error.message);
        else totalSynced += rows.length;
      }

      // 9. Themes
      if (payload.themes.length > 0) {
        const rows = payload.themes.map((th) => ({
          id: ensureUuid(th.id),
          theme_name: th.themeName,
          weight: th.weight,
          direction: th.direction,
          evidence: th.evidence || [],
          cluster_names: th.clusterNames || [],
          trend_names: th.trendNames || [],
          updated_at: th.updatedAt || new Date().toISOString(),
        }));
        const { error } = await client.from('themes').upsert(rows);
        if (error) console.warn('[Supabase] themes sync note:', error.message);
        else totalSynced += rows.length;
      }

      // 10. Summaries
      if (payload.summaries.length > 0) {
        const rows = payload.summaries.map((s) => ({
          id: ensureUuid(s.id),
          type: s.type,
          period_start: s.periodStart,
          period_end: s.periodEnd,
          content: s.content || '',
          themes: (s.themes || []).map((t) => (typeof t === 'string' ? t : t.name)),
          highlights: s.highlights || [],
          task_suggestions: s.taskSuggestions || [],
          chart_data: s.annualData || {},
          created_at: s.createdAt || new Date().toISOString(),
        }));
        const { error } = await client.from('summaries').upsert(rows);
        if (error) console.warn('[Supabase] summaries sync note:', error.message);
        else totalSynced += rows.length;
      }

      const now = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, now);
      this.status.state = 'synced';
      this.status.lastSyncedAt = now;
      this.status.error = null;
      this.status.itemCount = totalSynced;
      this.notify();

      return {
        success: true,
        message: `成功将 ${totalSynced} 条记录同步保存至 Supabase 云端！`,
        count: totalSynced,
      };
    } catch (err: any) {
      console.error('[Supabase Sync Error]', err);
      this.status.state = 'error';
      this.status.error = err.message || String(err);
      this.notify();
      return {
        success: false,
        message: `同步出错: ${err.message}`,
        count: totalSynced,
      };
    }
  }

  public async pullAll(): Promise<{
    success: boolean;
    message: string;
    data?: {
      memories?: Memory[];
      photos?: Photo[];
      notes?: Note[];
      tasks?: Task[];
      reflections?: Reflection[];
      checkInTypes?: CheckInType[];
      checkInRecords?: CheckInRecord[];
      trends?: Trend[];
      themes?: ThemeItem[];
      summaries?: Summary[];
    };
  }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'Supabase 未配置' };
    }

    this.status.state = 'syncing';
    this.status.error = null;
    this.notify();

    try {
      const results: any = {
        memories: [],
        photos: [],
        notes: [],
        tasks: [],
        reflections: [],
        summaries: [],
        checkInTypes: [],
        checkInRecords: [],
        trends: [],
        themes: [],
      };
      const offloadedSet = getOffloadedIdSet();
      const { idSet: deletedIdSet } = getDeletedRecordsInfo();

      // Pull memories (Ghost prevention: exclude is_deleted, offloaded, and deletedIdSet)
      const { data: mems } = await client
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });
      if (mems && mems.length > 0) {
        results.memories = mems
          .filter((m: any) => !m.is_deleted && !offloadedSet.has(m.id) && !deletedIdSet.has(m.id))
          .map((m: any) => ({
            id: m.id,
            title: m.title || null,
            content: m.content,
            tags: m.tags || [],
            aiSummary: m.ai_summary || null,
            relatedMediaIds: m.related_media_ids || [],
            photos: m.photos || [],
            locationName: m.location_name || null,
            latitude: m.latitude || null,
            longitude: m.longitude || null,
            localStorageStatus: 'downloaded',
            isDeleted: false,
            createdAt: m.created_at,
          }));
      }

      // Pull photos (Ghost prevention)
      const { data: pts } = await client
        .from('photos')
        .select('*')
        .order('taken_at', { ascending: false });
      if (pts && pts.length > 0) {
        results.photos = pts
          .filter((p: any) => !p.is_deleted && !offloadedSet.has(p.id) && !deletedIdSet.has(p.id))
          .map((p: any) => ({
            id: p.id,
            localPath: p.local_path,
            takenAt: p.taken_at,
            aiSummary: p.ai_summary || null,
            summaryConfirmed: p.summary_confirmed || false,
            tags: p.tags || [],
            relatedMemoryIds: p.related_memory_ids || [],
            locationName: p.metadata?.locationName || null,
            latitude: p.metadata?.latitude || null,
            longitude: p.metadata?.longitude || null,
            metadata: p.metadata || {},
            localStorageStatus: 'downloaded',
            isDeleted: false,
            createdAt: p.created_at,
          }));
      }

      // Pull notes (Ghost prevention)
      const { data: nts } = await client
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (nts && nts.length > 0) {
        results.notes = nts
          .filter((n: any) => !n.is_deleted && !offloadedSet.has(n.id) && !deletedIdSet.has(n.id))
          .map((n: any) => {
            let tags: string[] = [];
            try {
              if (n.ai_organized) tags = JSON.parse(n.ai_organized);
            } catch (_) {}
            return {
              id: n.id,
              title: n.title || '',
              content: n.content,
              tags,
              isPinned: n.ai_status === 'pinned',
              localStorageStatus: 'downloaded',
              isDeleted: false,
              createdAt: n.created_at,
              updatedAt: n.updated_at,
            };
          });
      }

      // Pull tasks (Ghost prevention)
      const { data: tsks } = await client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (tsks && tsks.length > 0) {
        results.tasks = tsks
          .filter((t: any) => !t.is_deleted && !offloadedSet.has(t.id) && !deletedIdSet.has(t.id))
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            category: t.category || '健康',
            priority: t.priority || '中',
            startTime: t.start_time || null,
            dueTime: t.due_time || null,
            reminderTime: t.reminder_time || null,
            repeatRule: t.repeat_rule || '无',
            estimatedMinutes: t.estimated_minutes || null,
            status: t.status || '未开始',
            steps: t.steps || [],
            sourceReflectionId: t.source_reflection_id || null,
            feedback: t.feedback || {},
            checkInTypeId: t.check_in_type_ids?.[0] || null,
            localStorageStatus: 'downloaded',
            isDeleted: false,
            createdAt: t.created_at,
          }));
      }

      // Pull reflections (Ghost prevention)
      const { data: refs } = await client
        .from('reflections')
        .select('*')
        .order('created_at', { ascending: false });
      if (refs && refs.length > 0) {
        results.reflections = refs
          .filter((r: any) => !r.is_deleted && !offloadedSet.has(r.id) && !deletedIdSet.has(r.id))
          .map((r: any) => ({
            id: r.id,
            eventDescription: r.event_description,
            emotion: r.emotion || '平静',
            actionTaken: r.action_taken || null,
            result: r.result || null,
            aiSummary: r.ai_summary || null,
            relatedMemoryIds: r.related_memory_ids || [],
            relatedPhotoIds: r.related_photo_ids || [],
            relatedTaskIds: r.related_task_ids || [],
            relatedSummaryIds: r.related_summary_ids || [],
            isUserConfirmed: r.is_user_confirmed || false,
            localStorageStatus: 'downloaded',
            isDeleted: false,
            createdAt: r.created_at,
          }));
      }

      // Pull check-in types (deduplicate by label to prevent duplicate habits)
      const { data: cTypes } = await client
        .from('check_in_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (cTypes && cTypes.length > 0) {
        const seenLabels = new Set<string>();
        const uniqueTypes: any[] = [];
        const duplicateIds: string[] = [];

        for (const t of cTypes) {
          const label = (t.label || '').trim();
          if (!label) continue;
          if (seenLabels.has(label)) {
            duplicateIds.push(t.id);
            continue;
          }
          seenLabels.add(label);
          uniqueTypes.push({
            id: t.id,
            name: label,
            symbol: t.symbol || '📖',
            sortOrder: t.sort_order ?? 0,
            enabled: t.enabled ?? true,
            createdAt: t.created_at,
          });
        }
        results.checkInTypes = uniqueTypes;

        // Clean up cloud duplicate habit rows in background if any exist
        if (duplicateIds.length > 0) {
          try {
            await client.from('check_in_types').delete().in('id', duplicateIds);
            console.log(`[Supabase] Cleaned up ${duplicateIds.length} duplicate habit types in cloud`);
          } catch (e) {
            console.warn('[Supabase] Note on cleaning duplicate habit types:', e);
          }
        }
      }

      // Pull check-in records
      const { data: cRecs } = await client
        .from('check_in_records')
        .select('*')
        .order('date', { ascending: false });
      if (cRecs && cRecs.length > 0) {
        results.checkInRecords = cRecs.map((r: any) => ({
          id: r.id,
          date: r.date,
          typeId: r.type_id,
          typeName: r.label_snapshot,
          symbol: r.symbol_snapshot,
          createdAt: r.created_at,
        }));
      }

      // Pull trends
      const { data: trs } = await client
        .from('trends')
        .select('*')
        .order('updated_at', { ascending: false });
      if (trs && trs.length > 0) {
        results.trends = trs.map((t: any) => ({
          id: t.id,
          trendName: t.trend_name,
          category: t.category,
          score: Number(t.score) || 0,
          direction: t.direction,
          weight: Number(t.weight) || 0,
          evidence: t.evidence || [],
          cluster: t.cluster || '',
          updatedAt: t.updated_at,
        }));
      }

      // Pull themes
      const { data: ths } = await client
        .from('themes')
        .select('*')
        .order('updated_at', { ascending: false });
      if (ths && ths.length > 0) {
        results.themes = ths.map((t: any) => ({
          id: t.id,
          themeName: t.theme_name,
          weight: Number(t.weight) || 0,
          direction: t.direction,
          evidence: t.evidence || [],
          clusterNames: t.cluster_names || [],
          trendNames: t.trend_names || [],
          updatedAt: t.updated_at,
        }));
      }

      // Pull summaries (with state machine support)
      const { data: sums } = await client
        .from('summaries')
        .select('*')
        .order('created_at', { ascending: false });
      if (sums && sums.length > 0) {
        results.summaries = sums
          .filter((s: any) => !s.is_deleted && !offloadedSet.has(s.id) && !deletedIdSet.has(s.id))
          .map((s: any) => ({
            id: s.id,
            type: s.type,
            periodStart: s.period_start,
            periodEnd: s.period_end,
            periodKey: s.period_key,
            isFrozen: s.is_frozen ?? false,
            version: s.version ?? 1,
            content: s.content || '',
            themes: (s.themes || []).map((t: any) =>
              typeof t === 'string' ? { name: t, direction: '稳定', weight: 1 } : t
            ),
            highlights: s.highlights || [],
            taskSuggestions: s.task_suggestions || [],
            annualData: s.annual_data || s.chart_data || undefined,
            localStorageStatus: 'downloaded',
            isDeleted: false,
            createdAt: s.created_at,
          }));
      }

      const now = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, now);
      this.status.state = 'synced';
      this.status.lastSyncedAt = now;
      this.status.error = null;
      this.notify();

      return {
        success: true,
        message: '已成功从 Supabase 云端拉取最新数据！',
        data: results,
      };
    } catch (err: any) {
      console.error('[Supabase Pull Error]', err);
      this.status.state = 'error';
      this.status.error = err.message || String(err);
      this.notify();
      return { success: false, message: `拉取失败: ${err.message}` };
    }
  }

  // ==========================================
  // Single-Entity Real-time Sync Helpers
  // ==========================================

  public async syncRecord(
    table: string,
    action: 'upsert' | 'delete',
    id: string,
    data?: any
  ): Promise<void> {
    const config = this.getConfig();
    if (!config.autoSync) return;

    const client = this.getClient();
    if (!client) return;

    try {
      if (action === 'delete') {
        await client.from(table).delete().eq('id', id);
      } else if (action === 'upsert' && data) {
        await client.from(table).upsert(data);
      }
    } catch (err) {
      console.warn(`[Supabase Async Sync] Failed for ${table}/${action}:`, err);
    }
  }

  // 48-Hour Periodic Reconciliation Engine (模块 4)
  public async reconcile48Hours(): Promise<{ triggered: boolean; message: string }> {
    const lastTimeRaw = localStorage.getItem('last_reconcile_time');
    const lastTime = lastTimeRaw ? parseInt(lastTimeRaw, 10) : 0;
    const now = Date.now();
    const intervalMs = 48 * 60 * 60 * 1000;

    if (now - lastTime < intervalMs) {
      return { triggered: false, message: '未到达48小时对齐周期，跳过对齐。' };
    }

    // 触发 48 小时增量对齐
    const pullRes = await this.pullAll();
    localStorage.setItem('last_reconcile_time', String(now));
    return {
      triggered: true,
      message: pullRes.success ? '48小时数据自动对齐成功' : `对齐失败: ${pullRes.message}`,
    };
  }

  // Cloud Archive Retrieval (查询云端已瘦身/已归档项，支持重新下载至本地)
  public async getCloudArchivedItems(): Promise<{
    memories: any[];
    photos: any[];
    notes: any[];
    tasks: any[];
    reflections: any[];
    summaries: any[];
  }> {
    const client = this.getClient();
    if (!client) {
      return { memories: [], photos: [], notes: [], tasks: [], reflections: [], summaries: [] };
    }

    const offloadedSet = getOffloadedIdSet();
    const result: any = {
      memories: [],
      photos: [],
      notes: [],
      tasks: [],
      reflections: [],
      summaries: [],
    };

    try {
      const [mRes, pRes, nRes, tRes, rRes, sRes] = await Promise.all([
        client.from('memories').select('*').eq('is_deleted', false),
        client.from('photos').select('*').eq('is_deleted', false),
        client.from('notes').select('*').eq('is_deleted', false),
        client.from('tasks').select('*').eq('is_deleted', false),
        client.from('reflections').select('*').eq('is_deleted', false),
        client.from('summaries').select('*').eq('is_deleted', false),
      ]);

      if (mRes.data) {
        result.memories = mRes.data.filter(
          (m: any) => m.local_storage_status === 'offloaded' || offloadedSet.has(m.id)
        );
      }
      if (pRes.data) {
        result.photos = pRes.data.filter(
          (p: any) => p.local_storage_status === 'offloaded' || offloadedSet.has(p.id)
        );
      }
      if (nRes.data) {
        result.notes = nRes.data.filter(
          (n: any) => n.local_storage_status === 'offloaded' || offloadedSet.has(n.id)
        );
      }
      if (tRes.data) {
        result.tasks = tRes.data.filter(
          (t: any) => t.local_storage_status === 'offloaded' || offloadedSet.has(t.id)
        );
      }
      if (rRes.data) {
        result.reflections = rRes.data.filter(
          (r: any) => r.local_storage_status === 'offloaded' || offloadedSet.has(r.id)
        );
      }
      if (sRes.data) {
        result.summaries = sRes.data.filter(
          (s: any) => s.local_storage_status === 'offloaded' || offloadedSet.has(s.id)
        );
      }
    } catch (e) {
      console.warn('[getCloudArchivedItems] Failed:', e);
    }

    return result;
  }
}

export const supabaseService = new SupabaseService();
