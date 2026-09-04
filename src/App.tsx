// src/App.tsx
import React from 'react';
import { useApp } from './context/AppContext';
import { useAppModals } from './hooks/useAppModals';
import { Navigation } from './components/Navigation';
import { TodayView } from './components/TodayView';
import { RecordsView } from './components/RecordsView';
import { TasksView } from './components/TasksView';
import { ReviewView } from './components/ReviewView';
import { QuickActionDrawer } from './components/QuickActionDrawer';
import { TaskEditModal } from './components/TaskEditModal';
import { TaskStatusModal } from './components/TaskStatusModal';
import { ReflectionEditModal } from './components/ReflectionEditModal';
import { MemoryEditModal } from './components/MemoryEditModal';
import { NoteEditModal } from './components/NoteEditModal';
import { PhotoEditModal } from './components/PhotoEditModal';
import { BiometricModal } from './components/BiometricModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const { activeTab, changeTaskStatus, isBiometricLocked } = useApp();

  const {
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
  } = useAppModals({ changeTaskStatus, isBiometricLocked });

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-800 font-sans antialiased selection:bg-sky-200">
      <div className="max-w-md mx-auto sm:max-w-xl min-h-screen bg-white shadow-xl relative flex flex-col">
        {/* Navigation & Top Bar */}
        <Navigation onQuickAction={() => setQuickActionOpen(true)} />

        {/* Primary Views */}
        <main className="flex-1 p-4 overflow-y-auto">
          {activeTab === 'today' && (
            <TodayView
              onOpenTaskCreate={handleOpenTaskCreate}
              onOpenTaskEdit={handleOpenTaskEdit}
              onOpenTaskStatus={handleOpenTaskStatus}
              onOpenMemoryCreate={handleOpenMemoryCreate}
              onOpenNoteCreate={handleOpenNoteCreate}
              onOpenPhotoCreate={handleOpenPhotoCreate}
              onOpenReflectionCreate={handleOpenReflectionCreate}
              onUnlockBiometric={() => setBiometricModalOpen(true)}
            />
          )}

          {activeTab === 'records' && (
            <RecordsView
              onOpenMemoryCreate={handleOpenMemoryCreate}
              onOpenMemoryEdit={handleOpenMemoryEdit}
              onOpenNoteCreate={handleOpenNoteCreate}
              onOpenNoteEdit={handleOpenNoteEdit}
              onOpenPhotoCreate={handleOpenPhotoCreate}
              onOpenPhotoEdit={handleOpenPhotoEdit}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              onOpenTaskCreate={handleOpenTaskCreate}
              onOpenTaskEdit={handleOpenTaskEdit}
              onOpenTaskStatus={handleOpenTaskStatus}
            />
          )}

          {activeTab === 'review' && (
            <ReviewView
              onOpenReflectionCreate={handleOpenReflectionCreate}
              onOpenReflectionEdit={handleOpenReflectionEdit}
              onUnlockBiometric={() => setBiometricModalOpen(true)}
              onOpenTaskCreate={(title) => handleOpenTaskCreate(title)}
            />
          )}
        </main>

        {/* Quick Action Drawer */}
        <QuickActionDrawer
          isOpen={quickActionOpen}
          onClose={() => setQuickActionOpen(false)}
          onOpenMemoryCreate={handleOpenMemoryCreate}
          onOpenNoteCreate={handleOpenNoteCreate}
          onOpenPhotoCreate={handleOpenPhotoCreate}
          onOpenTaskCreate={() => handleOpenTaskCreate()}
          onOpenReflectionCreate={handleOpenReflectionCreate}
        />

        {/* Global Modals */}
        <TaskEditModal
          isOpen={taskModalOpen}
          task={editingTask}
          initialTitle={initialTaskTitle}
          initialCategory={initialTaskCategory}
          onClose={() => setTaskModalOpen(false)}
        />

        <TaskStatusModal
          isOpen={statusModalOpen}
          task={statusTask}
          targetStatus={targetStatus}
          onClose={() => setStatusModalOpen(false)}
          onConfirm={handleConfirmTaskStatus}
        />

        <ReflectionEditModal
          isOpen={reflectionModalOpen}
          reflection={editingReflection}
          onClose={() => setReflectionModalOpen(false)}
          onOpenTaskCreate={(title) => {
            setReflectionModalOpen(false);
            handleOpenTaskCreate(title);
          }}
        />

        <MemoryEditModal
          isOpen={memoryModalOpen}
          memory={editingMemory}
          onClose={() => setMemoryModalOpen(false)}
        />

        <NoteEditModal
          isOpen={noteModalOpen}
          note={editingNote}
          onClose={() => setNoteModalOpen(false)}
        />

        <PhotoEditModal
          isOpen={photoModalOpen}
          photo={editingPhoto}
          onClose={() => setPhotoModalOpen(false)}
        />

        <BiometricModal
          isOpen={biometricModalOpen}
          onClose={() => setBiometricModalOpen(false)}
          onSuccess={() => {
            setBiometricModalOpen(false);
          }}
        />

        <SettingsModal />
      </div>
    </div>
  );
};
