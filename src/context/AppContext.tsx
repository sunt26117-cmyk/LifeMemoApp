// src/context/AppContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppTheme,
  CancelType,
  CheckInRecord,
  CheckInType,
  DelayType,
  Memory,
  Note,
  Photo,
  Reflection,
  Summary,
  Task,
  TaskStatus,
  ThemeItem,
  Trend,
} from '../types';
import { AppStorage } from '../services/storage';
import { ChangeTaskStatusParams, executeTaskStatusTransition } from '../services/taskService';
import { supabaseService, SyncStatus } from '../services/supabaseService';
import { newUuid } from '../utils/uuidUtil';
import { habitNotificationService } from '../services/habitNotificationService';

interface AppContextType {
  // Navigation
  activeTab: 'today' | 'records' | 'tasks' | 'review';
  setActiveTab: (tab: 'today' | 'records' | 'tasks' | 'review') => void;
  subTab: string;
  setSubTab: (sub: string) => void;

  // Settings
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // Supabase Sync
  syncStatus: SyncStatus;
  uploadToSupabase: () => Promise<{ success: boolean; message: string; count: number }>;
  pullFromSupabase: () => Promise<{ success: boolean; message: string }>;

  // Biometric / PIN
  isBiometricLocked: boolean;
  unlockBiometric: (pin: string) => boolean;
  lockBiometric: () => void;
  setPin: (pin: string | null) => void;
  hasPin: boolean;

  // Data
  memories: Memory[];
  addMemory: (m: Omit<Memory, 'id' | 'createdAt'>) => Memory;
  updateMemory: (m: Memory) => void;
  deleteMemory: (id: string) => void;

  photos: Photo[];
  addPhoto: (p: Omit<Photo, 'id' | 'createdAt'>) => Photo;
  updatePhoto: (p: Photo) => void;
  deletePhoto: (id: string) => void;

  notes: Note[];
  addNote: (n: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Note;
  updateNote: (n: Note) => void;
  deleteNote: (id: string) => void;

  tasks: Task[];
  addTask: (t: Omit<Task, 'id' | 'createdAt'>) => Task;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  changeTaskStatus: (params: ChangeTaskStatusParams) => void;

  reflections: Reflection[];
  addReflection: (r: Omit<Reflection, 'id' | 'createdAt'>) => Reflection;
  updateReflection: (r: Reflection) => void;
  deleteReflection: (id: string) => void;

  checkInTypes: CheckInType[];
  addCheckInType: (t: Omit<CheckInType, 'id' | 'createdAt'>) => CheckInType;
  updateCheckInType: (t: CheckInType) => void;
  toggleCheckIn: (date: string, type: CheckInType) => void;
  checkInRecords: CheckInRecord[];

  trends: Trend[];
  themes: ThemeItem[];

  summaries: Summary[];
  addSummary: (s: Omit<Summary, 'id' | 'createdAt'>) => Summary;

  // Refactor Module 1: Reset & Anchor
  statAnchorDate: string | null;
  resetCheckInsAndTrends: () => void;

  // Refactor Module 3: Dual-Track Delete & Offload
  offloadItem: (
    collection: 'memories' | 'photos' | 'notes' | 'tasks' | 'reflections' | 'summaries',
    id: string
  ) => void;
  permanentDeleteItem: (
    collection: 'memories' | 'photos' | 'notes' | 'tasks' | 'reflections' | 'summaries',
    id: string
  ) => void;
  restoreItem: (
    collection: 'memories' | 'photos' | 'notes' | 'tasks' | 'reflections' | 'summaries',
    item: any
  ) => void;

  // 1-Second Praise Toast
  praiseToast: string | null;
  showPraise: (msg: string) => void;

  // Dynamic Task Categories (偏向个人私生活 & 自由增删)
  taskCategories: string[];
  addTaskCategory: (name: string) => boolean;
  deleteTaskCategory: (name: string) => void;
  removeTaskCategory: (name: string) => void;
  resetTaskCategories: () => void;

  // Visual Theme (3种风格：静谧晴空、暖阳麦浪、森意清幽)
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;

  // Fullscreen Photo Viewer (点击照片全屏查看)
  photoPreview: { url: string; title?: string } | null;
  openPhotoPreview: (url: string, title?: string) => void;
  closePhotoPreview: () => void;
}


const CATEGORY_PRAISES: Record<string, string> = {
  运动: '自律爆发！身体正在感谢你的每一次挥汗💪',
  健康: '身心愉悦！每一个健康举动都在为你充电🌿',
  学习: '思维精进！每一分专注都在沉淀智慧📚',
  项目: '推进迅速！离既定目标又近了一大步🚀',
  规划: '条理清晰！笃定掌控自己的人生节奏🧭',
  习惯: '好习惯+1！稳步前行就是最快的方式✨',
  情绪: '从容平和！敏锐觉察让你更有力量🌊',
  沟通: '同频共振！高质量沟通连接无限可能💬',
  散步: '脚步轻盈！在放松中重获清晰灵感🚶',
  早起: '晨光作伴！元气满满开启新的一天☀️',
  阅读: '见识深远！书籍是拓宽边界的阶梯📖',
  冥想: '心神合一！静谧中蕴含无限生机🧘',
};

export function getCategoryPraise(categoryOrType: string): string {
  return CATEGORY_PRAISES[categoryOrType] || '笃定前行！点滴微小的坚持正在汇聚成光✨';
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'today' | 'records' | 'tasks' | 'review'>('today');
  const [subTab, setSubTab] = useState<string>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Biometrics
  const hasPin = Boolean(AppStorage.getPin());
  const [isBiometricLocked, setIsBiometricLocked] = useState<boolean>(hasPin);

  // States
  const [memories, setMemories] = useState<Memory[]>(() => AppStorage.getMemories());
  const [photos, setPhotos] = useState<Photo[]>(() => AppStorage.getPhotos());
  const [notes, setNotes] = useState<Note[]>(() => AppStorage.getNotes());
  const [tasks, setTasks] = useState<Task[]>(() => AppStorage.getTasks());
  const [reflections, setReflections] = useState<Reflection[]>(() => AppStorage.getReflections());
  const [checkInTypes, setCheckInTypes] = useState<CheckInType[]>(() => AppStorage.getCheckInTypes());
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>(() => AppStorage.getCheckInRecords());
  const [trends, setTrends] = useState<Trend[]>(() => AppStorage.getTrends());
  const [themes, setThemes] = useState<ThemeItem[]>(() => AppStorage.getThemes());
  const [summaries, setSummaries] = useState<Summary[]>(() => AppStorage.getSummaries());
  const [statAnchorDate, setStatAnchorDate] = useState<string | null>(() =>
    AppStorage.getStatAnchorDate()
  );

  // 1-second praise toast state (transient, no persistence)
  const [praiseToast, setPraiseToast] = useState<string | null>(null);

  const showPraise = (msg: string) => {
    setPraiseToast(msg);
    setTimeout(() => {
      setPraiseToast((cur) => (cur === msg ? null : cur));
    }, 1000);
  };

  // Dynamic Task Categories
  const [taskCategories, setTaskCategories] = useState<string[]>(() =>
    AppStorage.getTaskCategories()
  );
  const addTaskCategory = (name: string) => {
    const ok = AppStorage.addTaskCategory(name);
    if (ok) setTaskCategories(AppStorage.getTaskCategories());
    return ok;
  };
  const deleteTaskCategory = (name: string) => {
    AppStorage.deleteTaskCategory(name);
    setTaskCategories(AppStorage.getTaskCategories());
  };
  const resetTaskCategories = () => {
    AppStorage.resetTaskCategories();
    setTaskCategories(AppStorage.getTaskCategories());
  };

  // Visual Theme
  const [theme, setThemeState] = useState<AppTheme>(() => AppStorage.getAppTheme());
  const setTheme = (t: AppTheme) => {
    AppStorage.setAppTheme(t);
    setThemeState(t);
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Fullscreen Photo Viewer
  const [photoPreview, setPhotoPreview] = useState<{ url: string; title?: string } | null>(null);
  const openPhotoPreview = (url: string, title?: string) => setPhotoPreview({ url, title });
  const closePhotoPreview = () => setPhotoPreview(null);

  // Supabase sync status state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    lastSyncedAt: localStorage.getItem('ai_recorder_supabase_last_sync'),
    error: null,
    itemCount: 0,
  });

  useEffect(() => {
    const unsub = supabaseService.subscribe((status) => {
      setSyncStatus(status);
    });
    // Trigger 48-hour periodic reconciliation silently on mount
    supabaseService.reconcile48Hours().catch(() => {});
    return () => unsub();
  }, []);

  // Listen to external/storage updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      setMemories(AppStorage.getMemories());
      setPhotos(AppStorage.getPhotos());
      setNotes(AppStorage.getNotes());
      setTasks(AppStorage.getTasks());
      setReflections(AppStorage.getReflections());
      setCheckInTypes(AppStorage.getCheckInTypes());
      setCheckInRecords(AppStorage.getCheckInRecords());
      setTrends(AppStorage.getTrends());
      setThemes(AppStorage.getThemes());
      setSummaries(AppStorage.getSummaries());
      setStatAnchorDate(AppStorage.getStatAnchorDate());
      setTaskCategories(AppStorage.getTaskCategories());
      setThemeState(AppStorage.getAppTheme());
    };
    window.addEventListener('app_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('app_storage_updated', handleStorageUpdate);
  }, []);


  // Upload all local data to Supabase
  const uploadToSupabase = async () => {
    const res = await supabaseService.uploadAll({
      memories: AppStorage.getMemories(),
      photos: AppStorage.getPhotos(),
      notes: AppStorage.getNotes(),
      tasks: AppStorage.getTasks(),
      reflections: AppStorage.getReflections(),
      checkInTypes: AppStorage.getCheckInTypes(),
      checkInRecords: AppStorage.getCheckInRecords(),
      trends: AppStorage.getTrends(),
      themes: AppStorage.getThemes(),
      summaries: AppStorage.getSummaries(),
    });
    return res;
  };

  // Pull all data from Supabase and merge/replace locally
  const pullFromSupabase = async () => {
    const res = await supabaseService.pullAll();
    if (res.success && res.data) {
      if (res.data.memories !== undefined) {
        AppStorage.saveMemories(res.data.memories);
        setMemories(res.data.memories);
      }
      if (res.data.photos !== undefined) {
        AppStorage.savePhotos(res.data.photos);
        setPhotos(res.data.photos);
      }
      if (res.data.notes !== undefined) {
        AppStorage.saveNotes(res.data.notes);
        setNotes(res.data.notes);
      }
      if (res.data.tasks !== undefined) {
        AppStorage.saveTasks(res.data.tasks);
        setTasks(res.data.tasks);
      }
      if (res.data.reflections !== undefined) {
        AppStorage.saveReflections(res.data.reflections);
        setReflections(res.data.reflections);
      }
      if (res.data.checkInTypes !== undefined) {
        AppStorage.saveCheckInTypes(res.data.checkInTypes);
        setCheckInTypes(res.data.checkInTypes);
      }
      if (res.data.checkInRecords !== undefined) {
        AppStorage.saveCheckInRecords(res.data.checkInRecords);
        setCheckInRecords(res.data.checkInRecords);
      }
      if (res.data.trends !== undefined) {
        AppStorage.saveTrends(res.data.trends);
        setTrends(res.data.trends);
      }
      if (res.data.themes !== undefined) {
        AppStorage.saveThemes(res.data.themes);
        setThemes(res.data.themes);
      }
      if (res.data.summaries !== undefined) {
        AppStorage.saveSummaries(res.data.summaries);
        setSummaries(res.data.summaries);
      }
    }
    return { success: res.success, message: res.message };
  };

  // Biometric methods
  const unlockBiometric = (pin: string) => {
    const storedPin = AppStorage.getPin();
    if (!storedPin || storedPin === pin) {
      setIsBiometricLocked(false);
      return true;
    }
    return false;
  };

  const lockBiometric = () => {
    if (AppStorage.getPin()) {
      setIsBiometricLocked(true);
    }
  };

  const setPin = (pin: string | null) => {
    AppStorage.setPin(pin);
    if (!pin) {
      setIsBiometricLocked(false);
    }
  };

  // Memory operations
  const addMemory = (m: Omit<Memory, 'id' | 'createdAt'>): Memory => {
    const newM: Memory = {
      ...m,
      id: newUuid(),
      createdAt: new Date().toISOString(),
    };
    AppStorage.upsertMemory(newM);
    setMemories(AppStorage.getMemories());
    return newM;
  };

  const updateMemory = (m: Memory) => {
    AppStorage.upsertMemory(m);
    setMemories(AppStorage.getMemories());
  };

  const deleteMemory = (id: string) => {
    AppStorage.deleteMemory(id);
    setMemories(AppStorage.getMemories());
    setPhotos(AppStorage.getPhotos());
  };

  // Photo operations
  const addPhoto = (p: Omit<Photo, 'id' | 'createdAt'>): Photo => {
    const newP: Photo = {
      ...p,
      id: newUuid(),
      createdAt: new Date().toISOString(),
    };
    AppStorage.upsertPhoto(newP);
    setPhotos(AppStorage.getPhotos());
    return newP;
  };

  const updatePhoto = (p: Photo) => {
    AppStorage.upsertPhoto(p);
    setPhotos(AppStorage.getPhotos());
  };

  const deletePhoto = (id: string) => {
    AppStorage.deletePhoto(id);
    setPhotos(AppStorage.getPhotos());
  };

  // Note operations
  const addNote = (n: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note => {
    const now = new Date().toISOString();
    const newN: Note = {
      ...n,
      id: newUuid(),
      createdAt: now,
      updatedAt: now,
    };
    AppStorage.upsertNote(newN);
    setNotes(AppStorage.getNotes());
    return newN;
  };

  const updateNote = (n: Note) => {
    const updated = { ...n, updatedAt: new Date().toISOString() };
    AppStorage.upsertNote(updated);
    setNotes(AppStorage.getNotes());
  };

  const deleteNote = (id: string) => {
    AppStorage.deleteNote(id);
    setNotes(AppStorage.getNotes());
  };

  // Task operations
  const addTask = (t: Omit<Task, 'id' | 'createdAt'>): Task => {
    const newT: Task = {
      ...t,
      id: newUuid(),
      createdAt: new Date().toISOString(),
    };
    AppStorage.upsertTask(newT);
    setTasks(AppStorage.getTasks());
    return newT;
  };

  const updateTask = (t: Task) => {
    AppStorage.upsertTask(t);
    setTasks(AppStorage.getTasks());
  };

  const deleteTask = (id: string) => {
    AppStorage.deleteTask(id);
    setTasks(AppStorage.getTasks());
  };

  const changeTaskStatus = (params: ChangeTaskStatusParams) => {
    const targetTask = tasks.find((t) => t.id === params.taskId);
    const result = executeTaskStatusTransition(params, tasks, checkInTypes);
    if (result) {
      setTasks(AppStorage.getTasks());
      setCheckInRecords(AppStorage.getCheckInRecords());
      setTrends(AppStorage.getTrends());
      setThemes(AppStorage.getThemes());

      if (params.newStatus === '已完成') {
        showPraise(getCategoryPraise(targetTask?.category || '完成任务'));
      }
    }
  };

  // Reflection operations
  const addReflection = (r: Omit<Reflection, 'id' | 'createdAt'>): Reflection => {
    const newR: Reflection = {
      ...r,
      id: newUuid(),
      createdAt: new Date().toISOString(),
    };
    AppStorage.upsertReflection(newR);
    setReflections(AppStorage.getReflections());
    return newR;
  };

  const updateReflection = (r: Reflection) => {
    AppStorage.upsertReflection(r);
    setReflections(AppStorage.getReflections());
  };

  const deleteReflection = (id: string) => {
    AppStorage.deleteReflection(id);
    setReflections(AppStorage.getReflections());
  };

  // Check-in operations
  const addCheckInType = (t: Omit<CheckInType, 'id' | 'createdAt'>): CheckInType => {
    const newT: CheckInType = {
      ...t,
      id: newUuid(),
      createdAt: new Date().toISOString(),
    };
    AppStorage.upsertCheckInType(newT);
    setCheckInTypes(AppStorage.getCheckInTypes());
    return newT;
  };

  const updateCheckInType = (t: CheckInType) => {
    AppStorage.upsertCheckInType(t);
    setCheckInTypes(AppStorage.getCheckInTypes());
  };

  const toggleCheckIn = (date: string, type: CheckInType) => {
    const isCurrentlyChecked = checkInRecords.some(
      (r) => r.date === date && r.typeId === type.id
    );
    AppStorage.toggleCheckIn(date, type);
    setCheckInRecords(AppStorage.getCheckInRecords());

    // Trigger short encouragement toast when checked ON
    if (!isCurrentlyChecked) {
      showPraise(getCategoryPraise(type.name));
      // 【核心功能】：如果完成了当前习惯打卡，系统通知栏提醒立即关闭消失；提前打卡则到点不提醒
      const todayStr = new Date().toISOString().slice(0, 10);
      if (date === todayStr) {
        habitNotificationService.onHabitCompletedToday(type.id);
      }
    }
  };

  // Summary operations
  const addSummary = (s: Omit<Summary, 'id' | 'createdAt'>): Summary => {
    const newS: Summary = {
      ...s,
      id: newUuid(),
      createdAt: new Date().toISOString(),
    };
    AppStorage.upsertSummary(newS);
    setSummaries(AppStorage.getSummaries());
    return newS;
  };

  // Refactor Module 1: Reset Check-in & Trends Anchor
  const resetCheckInsAndTrends = () => {
    AppStorage.resetCheckInsAndTrends();
    setCheckInRecords(AppStorage.getCheckInRecords());
    setTrends(AppStorage.getTrends());
    setThemes(AppStorage.getThemes());
    setSummaries(AppStorage.getSummaries());
    setStatAnchorDate(AppStorage.getStatAnchorDate());
  };


  // Refactor Module 3: Dual-Track Delete & Offload
  const offloadItem = (
    collection: 'memories' | 'photos' | 'notes' | 'tasks' | 'reflections' | 'summaries',
    id: string
  ) => {
    AppStorage.offloadItem(collection, id);
    // Refresh states
    if (collection === 'memories') setMemories(AppStorage.getMemories());
    if (collection === 'photos') setPhotos(AppStorage.getPhotos());
    if (collection === 'notes') setNotes(AppStorage.getNotes());
    if (collection === 'tasks') setTasks(AppStorage.getTasks());
    if (collection === 'reflections') setReflections(AppStorage.getReflections());
    if (collection === 'summaries') setSummaries(AppStorage.getSummaries());
  };

  const permanentDeleteItem = (
    collection: 'memories' | 'photos' | 'notes' | 'tasks' | 'reflections' | 'summaries',
    id: string
  ) => {
    AppStorage.permanentDeleteItem(collection, id);
    if (collection === 'memories') setMemories(AppStorage.getMemories());
    if (collection === 'photos') setPhotos(AppStorage.getPhotos());
    if (collection === 'notes') setNotes(AppStorage.getNotes());
    if (collection === 'tasks') setTasks(AppStorage.getTasks());
    if (collection === 'reflections') setReflections(AppStorage.getReflections());
    if (collection === 'summaries') setSummaries(AppStorage.getSummaries());
  };

  const restoreItem = (
    collection: 'memories' | 'photos' | 'notes' | 'tasks' | 'reflections' | 'summaries',
    item: any
  ) => {
    AppStorage.restoreItem(collection, item);
    if (collection === 'memories') setMemories(AppStorage.getMemories());
    if (collection === 'photos') setPhotos(AppStorage.getPhotos());
    if (collection === 'notes') setNotes(AppStorage.getNotes());
    if (collection === 'tasks') setTasks(AppStorage.getTasks());
    if (collection === 'reflections') setReflections(AppStorage.getReflections());
    if (collection === 'summaries') setSummaries(AppStorage.getSummaries());
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        subTab,
        setSubTab,
        settingsOpen,
        setSettingsOpen,
        syncStatus,
        uploadToSupabase,
        pullFromSupabase,
        isBiometricLocked,
        unlockBiometric,
        lockBiometric,
        setPin,
        hasPin,
        memories,
        addMemory,
        updateMemory,
        deleteMemory,
        photos,
        addPhoto,
        updatePhoto,
        deletePhoto,
        notes,
        addNote,
        updateNote,
        deleteNote,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        changeTaskStatus,
        reflections,
        addReflection,
        updateReflection,
        deleteReflection,
        checkInTypes,
        addCheckInType,
        updateCheckInType,
        toggleCheckIn,
        checkInRecords,
        trends,
        themes,
        summaries,
        addSummary,
        statAnchorDate,
        resetCheckInsAndTrends,
        offloadItem,
        permanentDeleteItem,
        restoreItem,
        praiseToast,
        showPraise,
        taskCategories,
        addTaskCategory,
        deleteTaskCategory,
        removeTaskCategory: deleteTaskCategory,
        resetTaskCategories,
        theme,
        setTheme,
        photoPreview,
        openPhotoPreview,
        closePhotoPreview,
      }}

    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
