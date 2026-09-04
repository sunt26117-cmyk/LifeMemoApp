// src/context/AppContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
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
      if (res.data.memories) {
        AppStorage.saveMemories(res.data.memories);
        setMemories(res.data.memories);
      }
      if (res.data.photos) {
        AppStorage.savePhotos(res.data.photos);
        setPhotos(res.data.photos);
      }
      if (res.data.notes) {
        AppStorage.saveNotes(res.data.notes);
        setNotes(res.data.notes);
      }
      if (res.data.tasks) {
        AppStorage.saveTasks(res.data.tasks);
        setTasks(res.data.tasks);
      }
      if (res.data.reflections) {
        AppStorage.saveReflections(res.data.reflections);
        setReflections(res.data.reflections);
      }
      if (res.data.checkInTypes) {
        AppStorage.saveCheckInTypes(res.data.checkInTypes);
        setCheckInTypes(res.data.checkInTypes);
      }
      if (res.data.checkInRecords) {
        AppStorage.saveCheckInRecords(res.data.checkInRecords);
        setCheckInRecords(res.data.checkInRecords);
      }
      if (res.data.trends) {
        AppStorage.saveTrends(res.data.trends);
        setTrends(res.data.trends);
      }
      if (res.data.themes) {
        AppStorage.saveThemes(res.data.themes);
        setThemes(res.data.themes);
      }
      if (res.data.summaries) {
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
    const result = executeTaskStatusTransition(params, tasks, checkInTypes);
    if (result) {
      setTasks(AppStorage.getTasks());
      setCheckInRecords(AppStorage.getCheckInRecords());
      setTrends(AppStorage.getTrends());
      setThemes(AppStorage.getThemes());
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
    AppStorage.toggleCheckIn(date, type);
    setCheckInRecords(AppStorage.getCheckInRecords());
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
