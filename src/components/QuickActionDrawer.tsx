// src/components/QuickActionDrawer.tsx
import React from 'react';
import { BookOpen, CheckSquare, Sparkles, StickyNote, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getThemeColors } from '../utils/themeStyles';

interface QuickActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMemoryCreate: () => void;
  onOpenNoteCreate: () => void;
  onOpenTaskCreate: () => void;
  onOpenReflectionCreate: () => void;
}

export const QuickActionDrawer: React.FC<QuickActionDrawerProps> = ({
  isOpen,
  onClose,
  onOpenMemoryCreate,
  onOpenNoteCreate,
  onOpenTaskCreate,
  onOpenReflectionCreate,
}) => {
  const { theme } = useApp();
  const themeColors = getThemeColors(theme);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className={`${themeColors.cardBg} border-t ${themeColors.cardBorder} rounded-t-3xl w-full max-w-md sm:max-w-xl p-5 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between pb-2 border-b ${themeColors.divider}`}>
          <span className={`text-xs font-semibold ${themeColors.textMain}`}>快捷记录中心</span>
          <button
            onClick={onClose}
            className={`p-1 ${themeColors.textSub} hover:${themeColors.textMain} ${themeColors.subtleHoverBg} rounded-full transition-colors`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scheme A: Unified text+photos+location in '写记录' */}
        <div className="grid grid-cols-4 gap-2.5 pt-1 text-center">
          <button
            onClick={() => {
              onClose();
              onOpenMemoryCreate();
            }}
            className={`flex flex-col items-center p-2.5 rounded-2xl ${themeColors.subtleHoverBg} transition-colors group cursor-pointer`}
          >
            <div className={`w-12 h-12 rounded-2xl ${themeColors.subtleBg} ${themeColors.primaryText} border ${themeColors.subtleBorder} flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <span className={`text-xs font-semibold ${themeColors.textMain}`}>写记录</span>
            <span className={`text-[10px] ${themeColors.textSub} mt-0.5`}>图文/定位</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenNoteCreate();
            }}
            className={`flex flex-col items-center p-2.5 rounded-2xl ${themeColors.subtleHoverBg} transition-colors group cursor-pointer`}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 border border-amber-200/80 flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <StickyNote className="w-5 h-5" />
            </div>
            <span className={`text-xs font-semibold ${themeColors.textMain}`}>随手记</span>
            <span className={`text-[10px] ${themeColors.textSub} mt-0.5`}>轻便签</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenTaskCreate();
            }}
            className={`flex flex-col items-center p-2.5 rounded-2xl ${themeColors.subtleHoverBg} transition-colors group cursor-pointer`}
          >
            <div className={`w-12 h-12 rounded-2xl ${themeColors.subtleBg} ${themeColors.primaryText} border ${themeColors.subtleBorder} flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform`}>
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className={`text-xs font-semibold ${themeColors.textMain}`}>建待办</span>
            <span className={`text-[10px] ${themeColors.textSub} mt-0.5`}>闭环执行</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenReflectionCreate();
            }}
            className={`flex flex-col items-center p-2.5 rounded-2xl ${themeColors.subtleHoverBg} transition-colors group cursor-pointer`}
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100/80 text-purple-700 border border-purple-200/80 flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className={`text-xs font-semibold ${themeColors.textMain}`}>做复盘</span>
            <span className={`text-[10px] ${themeColors.textSub} mt-0.5`}>AI深度反思</span>
          </button>
        </div>
      </div>
    </div>
  );
};
