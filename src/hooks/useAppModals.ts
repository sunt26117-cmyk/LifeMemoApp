// src/hooks/useAppModals.ts
import { useState } from 'react';
import {
  CancelType,
  DelayType,
  Memory,
  Note,
  Photo,
  Reflection,
  Task,
  TaskCategory,
  TaskStatus,
} from '../types';

interface UseAppModalsParams {
  changeTaskStatus: (params: {
    taskId: string;
    newStatus: TaskStatus;
    durationMinutes?: number;
    behaviorImprovement?: string[];
    delayType?: DelayType | null;
    cancelType?: CancelType | null;
    reason?: string | null;
  }) => void;
  isBiometricLocked: boolean;
}

export function useAppModals({ changeTaskStatus, isBiometricLocked }: UseAppModalsParams) {
  // Quick Action Sheet
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  // Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialTaskTitle, setInitialTaskTitle] = useState('');
  const [initialTaskCategory, setInitialTaskCategory] = useState<TaskCategory>('项目');

  // Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTask, setStatusTask] = useState<Task | null>(null);
  const [targetStatus, setTargetStatus] = useState<TaskStatus | null>(null);

  // Reflection Modal
  const [reflectionModalOpen, setReflectionModalOpen] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);

  // Memory Modal
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);

  // Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Photo Modal
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

  // Biometric Modal
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);

  // Task Handlers
  const handleOpenTaskCreate = (categoryOrTitle?: string | TaskCategory) => {
    setEditingTask(null);
    if (
      categoryOrTitle &&
      ['沟通', '学习', '健康', '项目', '情绪', '习惯', '规划'].includes(categoryOrTitle)
    ) {
      setInitialTaskCategory(categoryOrTitle as TaskCategory);
      setInitialTaskTitle('');
    } else if (categoryOrTitle) {
      setInitialTaskTitle(categoryOrTitle);
      setInitialTaskCategory('项目');
    } else {
      setInitialTaskTitle('');
      setInitialTaskCategory('项目');
    }
    setTaskModalOpen(true);
    setQuickActionOpen(false);
  };

  const handleOpenTaskEdit = (t: Task) => {
    setEditingTask(t);
    setTaskModalOpen(true);
  };

  const handleOpenTaskStatus = (t: Task, status: TaskStatus) => {
    setStatusTask(t);
    setTargetStatus(status);
    setStatusModalOpen(true);
  };

  const handleConfirmTaskStatus = (params: {
    durationMinutes?: number;
    behaviorImprovement?: string[];
    delayType?: DelayType | null;
    cancelType?: CancelType | null;
    reason?: string | null;
  }) => {
    if (statusTask && targetStatus) {
      changeTaskStatus({
        taskId: statusTask.id,
        newStatus: targetStatus,
        ...params,
      });
    }
  };

  // Reflection Handlers
  const handleOpenReflectionCreate = () => {
    if (isBiometricLocked) {
      setBiometricModalOpen(true);
      return;
    }
    setEditingReflection(null);
    setReflectionModalOpen(true);
    setQuickActionOpen(false);
  };

  const handleOpenReflectionEdit = (r: Reflection) => {
    if (isBiometricLocked) {
      setBiometricModalOpen(true);
      return;
    }
    setEditingReflection(r);
    setReflectionModalOpen(true);
  };

  // Memory Handlers
  const handleOpenMemoryCreate = () => {
    setEditingMemory(null);
    setMemoryModalOpen(true);
    setQuickActionOpen(false);
  };

  const handleOpenMemoryEdit = (m: Memory) => {
    setEditingMemory(m);
    setMemoryModalOpen(true);
  };

  // Note Handlers
  const handleOpenNoteCreate = () => {
    setEditingNote(null);
    setNoteModalOpen(true);
    setQuickActionOpen(false);
  };

  const handleOpenNoteEdit = (n: Note) => {
    setEditingNote(n);
    setNoteModalOpen(true);
  };

  // Photo Handlers
  const handleOpenPhotoCreate = () => {
    setEditingPhoto(null);
    setPhotoModalOpen(true);
    setQuickActionOpen(false);
  };

  const handleOpenPhotoEdit = (p: Photo) => {
    setEditingPhoto(p);
    setPhotoModalOpen(true);
  };

  return {
    quickActionOpen,
    setQuickActionOpen,
    taskModalOpen,
    setTaskModalOpen,
    editingTask,
    initialTaskTitle,
    initialTaskCategory,
    handleOpenTaskCreate,
    handleOpenTaskEdit,
    statusModalOpen,
    setStatusModalOpen,
    statusTask,
    targetStatus,
    handleOpenTaskStatus,
    handleConfirmTaskStatus,
    reflectionModalOpen,
    setReflectionModalOpen,
    editingReflection,
    handleOpenReflectionCreate,
    handleOpenReflectionEdit,
    memoryModalOpen,
    setMemoryModalOpen,
    editingMemory,
    handleOpenMemoryCreate,
    handleOpenMemoryEdit,
    noteModalOpen,
    setNoteModalOpen,
    editingNote,
    handleOpenNoteCreate,
    handleOpenNoteEdit,
    photoModalOpen,
    setPhotoModalOpen,
    editingPhoto,
    handleOpenPhotoCreate,
    handleOpenPhotoEdit,
    biometricModalOpen,
    setBiometricModalOpen,
  };
}
