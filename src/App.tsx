// src/App.tsx
import React from 'react';
import { useApp } from './context/AppContext';
import { useAppModals } from './hooks/useAppModals';
import { useAndroidNavigation } from './hooks/useAndroidNavigation';
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
import { PhotoFullscreenViewer } from './components/PhotoFullscreenViewer';
import { MascotOverlayLayer } from './features/spirit';
import { getThemeColors } from './utils/themeStyles';

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    changeTaskStatus,
    isBiometricLocked,
    praiseToast,
    theme,
    settingsOpen,
    setSettingsOpen,
    photoPreview,
    closePhotoPreview,
  } = useApp();
  const themeColors = getThemeColors(theme);

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

  // Android Native Back Button and Swipe Gestures
  const modalCloseHandlers = [
    { isOpen: !!photoPreview, close: closePhotoPreview },
    { isOpen: settingsOpen, close: () => setSettingsOpen(false) },
    { isOpen: biometricModalOpen, close: () => setBiometricModalOpen(false) },
    { isOpen: quickActionOpen, close: () => setQuickActionOpen(false) },
    { isOpen: photoModalOpen, close: () => setPhotoModalOpen(false) },
    { isOpen: noteModalOpen, close: () => setNoteModalOpen(false) },
    { isOpen: memoryModalOpen, close: () => setMemoryModalOpen(false) },
    { isOpen: reflectionModalOpen, close: () => setReflectionModalOpen(false) },
    { isOpen: statusModalOpen, close: () => setStatusModalOpen(false) },
    { isOpen: taskModalOpen, close: () => setTaskModalOpen(false) },
  ];

  const { exitToast, handleTouchStart, handleTouchEnd } = useAndroidNavigation({
    activeTab,
    setActiveTab,
    modalCloseHandlers,
  });

  return (
    <div
      className={`min-h-screen font-sans antialiased transition-colors duration-300 select-none ${themeColors.outerBg}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`max-w-md mx-auto sm:max-w-xl min-h-screen shadow-xl relative flex flex-col transition-colors duration-300 ${themeColors.innerBg}`}>
        {/* Navigation & Top Bar */}
        <Navigation onQuickAction={() => setQuickActionOpen(true)} />

        {/* 1-Second Praise Encouragement Toast */}
        {praiseToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200">
            <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-white/20">
              <span className="text-sm">🎉</span>
              <span>{praiseToast}</span>
            </div>
          </div>
        )}

        {/* Android Back Double-Press Exit Toast */}
        {exitToast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200 animate-fade-in">
            <div className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-2xl shadow-xl border border-white/20">
              {exitToast}
            </div>
          </div>
        )}

        {/* Primary Views */}
        <main className="flex-1 p-4 overflow-y-auto">
          {activeTab === 'today' && (
            <TodayView
              onOpenTaskCreate={handleOpenTaskCreate}
              onOpenTaskEdit={handleOpenTaskEdit}
              onOpenTaskStatus={handleOpenTaskStatus}
              onOpenMemoryCreate={handleOpenMemoryCreate}
              onOpenNoteCreate={handleOpenNoteCreate}
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
          onOpenTaskCreate={() => handleOpenTaskCreate()}
          onOpenReflectionCreate={handleOpenReflectionCreate}
        />

        {/* Global Modals - Conditionally rendered to guarantee completely clean initial state */}
        {taskModalOpen && (
          <TaskEditModal
            isOpen={taskModalOpen}
            task={editingTask}
            initialTitle={initialTaskTitle}
            initialCategory={initialTaskCategory}
            onClose={() => setTaskModalOpen(false)}
          />
        )}

        {statusModalOpen && (
          <TaskStatusModal
            isOpen={statusModalOpen}
            task={statusTask}
            targetStatus={targetStatus}
            onClose={() => setStatusModalOpen(false)}
            onConfirm={handleConfirmTaskStatus}
          />
        )}

        {reflectionModalOpen && (
          <ReflectionEditModal
            isOpen={reflectionModalOpen}
            reflection={editingReflection}
            onClose={() => setReflectionModalOpen(false)}
            onOpenTaskCreate={(title) => {
              setReflectionModalOpen(false);
              handleOpenTaskCreate(title);
            }}
          />
        )}

        {memoryModalOpen && (
          <MemoryEditModal
            isOpen={memoryModalOpen}
            memory={editingMemory}
            onClose={() => setMemoryModalOpen(false)}
          />
        )}

        {noteModalOpen && (
          <NoteEditModal
            isOpen={noteModalOpen}
            note={editingNote}
            onClose={() => setNoteModalOpen(false)}
          />
        )}

        {photoModalOpen && (
          <PhotoEditModal
            isOpen={photoModalOpen}
            photo={editingPhoto}
            onClose={() => setPhotoModalOpen(false)}
          />
        )}

        {biometricModalOpen && (
          <BiometricModal
            isOpen={biometricModalOpen}
            onClose={() => setBiometricModalOpen(false)}
            onSuccess={() => {
              setBiometricModalOpen(false);
            }}
          />
        )}

        <SettingsModal />
        <PhotoFullscreenViewer />
        <MascotOverlayLayer
          theme={theme}
          isBusy={
            quickActionOpen ||
            taskModalOpen ||
            statusModalOpen ||
            reflectionModalOpen ||
            memoryModalOpen ||
            noteModalOpen ||
            photoModalOpen ||
            biometricModalOpen ||
            settingsOpen ||
            Boolean(photoPreview)
          }
        />
      </div>

    </div>
  );
};
