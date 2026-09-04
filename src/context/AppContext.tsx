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

interface AppContextType {
  // Navigation
  activeTab: 'today' | 'records' | 'tasks' | 'review';
  setActiveTab: (tab: 'today' | 'records' | 'tasks' | 'review') => void;
  subTab: string;
  setSubTab: (sub: string) => void;

  // Settings
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

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
      id: `mem-${Date.now()}`,
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
      id: `photo-${Date.now()}`,
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
      id: `note-${Date.now()}`,
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
      id: `task-${Date.now()}`,
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
      id: `ref-${Date.now()}`,
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
      id: `type-${Date.now()}`,
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
      id: `sum-${Date.now()}`,
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
