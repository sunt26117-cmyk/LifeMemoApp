// src/components/QuickActionDrawer.tsx
import React from 'react';
import { BookOpen, Camera, CheckSquare, Sparkles, StickyNote, X } from 'lucide-react';

interface QuickActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMemoryCreate: () => void;
  onOpenNoteCreate: () => void;
  onOpenPhotoCreate: () => void;
  onOpenTaskCreate: () => void;
  onOpenReflectionCreate: () => void;
}

export const QuickActionDrawer: React.FC<QuickActionDrawerProps> = ({
  isOpen,
  onClose,
  onOpenMemoryCreate,
  onOpenNoteCreate,
  onOpenPhotoCreate,
  onOpenTaskCreate,
  onOpenReflectionCreate,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-md sm:max-w-xl p-5 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-700">快捷记录中心</span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 pt-1 text-center">
          <button
            onClick={onOpenMemoryCreate}
            className="flex flex-col items-center p-2.5 rounded-2xl hover:bg-sky-50 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-sky-100 text-[#4A90D9] flex items-center justify-center mb-1.5 shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-700">写记录</span>
          </button>

          <button
            onClick={onOpenNoteCreate}
            className="flex flex-col items-center p-2.5 rounded-2xl hover:bg-amber-50 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-1.5 shadow-2xs">
              <StickyNote className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-700">随手记</span>
          </button>

          <button
            onClick={onOpenPhotoCreate}
            className="flex flex-col items-center p-2.5 rounded-2xl hover:bg-emerald-50 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1.5 shadow-2xs">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-700">拍照片</span>
          </button>

          <button
            onClick={onOpenTaskCreate}
            className="flex flex-col items-center p-2.5 rounded-2xl hover:bg-blue-50 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5 shadow-2xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-700">建待办</span>
          </button>

          <button
            onClick={onOpenReflectionCreate}
            className="flex flex-col items-center p-2.5 rounded-2xl hover:bg-purple-50 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-1.5 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-700">做复盘</span>
          </button>
        </div>
      </div>
    </div>
  );
};
