// src/components/NoteEditModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Pin } from 'lucide-react';
import { Note } from '../types';
import { useApp } from '../context/AppContext';
import { getThemeColors } from '../utils/themeStyles';

interface NoteEditModalProps {
  isOpen: boolean;
  note?: Note | null;
  onClose: () => void;
}

export const NoteEditModal: React.FC<NoteEditModalProps> = ({
  isOpen,
  note,
  onClose,
}) => {
  const { addNote, updateNote, theme } = useApp();
  const themeColors = getThemeColors(theme);

  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);

  // Explicitly reset form fields whenever modal opens or note changes
  useEffect(() => {
    if (isOpen) {
      if (note) {
        setTitle(note.title || '');
        setContent(note.content || '');
        setIsPinned(note.isPinned || false);
      } else {
        setTitle('');
        setContent('');
        setIsPinned(false);
      }
    }
  }, [isOpen, note]);

  const resetAndClose = () => {
    setTitle('');
    setContent('');
    setIsPinned(false);
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const finalTitle = title.trim() || '快捷便签';

    if (note) {
      updateNote({
        ...note,
        title: finalTitle,
        content: content.trim(),
        isPinned,
      });
    } else {
      addNote({
        title: finalTitle,
        content: content.trim(),
        tags: ['便签'],
        isPinned,
      });
    }
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className={`${themeColors.cardBg} rounded-2xl w-full max-w-md shadow-xl p-6 relative border ${themeColors.cardBorder}`}>
        <button
          onClick={resetAndClose}
          className={`absolute top-4 right-4 p-1 ${themeColors.textSub} hover:${themeColors.textMain} rounded-full`}
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className={`text-base font-semibold ${themeColors.textMain} mb-4`}>
          {note ? '编辑便签' : '随手便签'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold ${themeColors.textMain} mb-1`}>便签标题</label>
            <input
              type="text"
              placeholder="例如：下周会议备忘 / 突发灵感"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full text-xs p-2.5 ${themeColors.subtleBg} border ${themeColors.subtleBorder} ${themeColors.textMain} rounded-xl focus:outline-none ${themeColors.focusRing}`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              内容 <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="快速记录即时灵感、要点、电话或临时清单..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full text-xs p-2.5 bg-amber-50/40 border border-amber-200/60 rounded-xl focus:outline-none ${themeColors.focusRing}`}
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-slate-600 font-medium">置顶此便签</span>
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs ${
                isPinned
                  ? 'bg-amber-100 text-amber-800 font-semibold'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>{isPinned ? '已置顶' : '未置顶'}</span>
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className={`px-4 py-2 ${themeColors.actionBtn} text-white text-xs font-medium rounded-xl transition-colors shadow-xs`}
            >
              保存便签
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
