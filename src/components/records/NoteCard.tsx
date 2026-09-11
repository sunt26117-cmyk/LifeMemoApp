// src/components/records/NoteCard.tsx
import React, { useState } from 'react';
import { Check, Copy, Edit2, Pin, Trash2 } from 'lucide-react';
import { Note } from '../../types';
import { useApp } from '../../context/AppContext';
import { getThemeColors } from '../../utils/themeStyles';

interface NoteCardProps {
  note: Note;
  onEdit: (n: Note) => void;
  onDelete: (id: string) => void;
}

// Theme-aware gentle stationery tint generator
const getNoteTint = (id: string, isPinned: boolean, theme: string) => {
  if (theme === 'warm') {
    if (isPinned) {
      return {
        bg: 'bg-[#FFF6EA] hover:bg-[#FFF3E0]',
        border: 'border-[#DEC09A] shadow-xs',
        accent: 'text-[#88421E]',
        pinFill: 'fill-[#B86B35] text-[#B86B35]',
      };
    }
    const tints = [
      { bg: 'bg-[#FAF2E6] hover:bg-[#F6EBDA]', border: 'border-[#EADBCA]' },
      { bg: 'bg-[#FDF7EE] hover:bg-[#F8EFE0]', border: 'border-[#ECE0D0]' },
      { bg: 'bg-[#F6EDE0] hover:bg-[#EFE3D2]', border: 'border-[#E4D2BF]' },
      { bg: 'bg-[#FCF1E6] hover:bg-[#F7E7D8]', border: 'border-[#F0D5BE]' },
    ];
    const charCode = id.charCodeAt(0) || 0;
    return {
      ...tints[charCode % tints.length],
      accent: 'text-[#5C4837]',
      pinFill: 'text-[#9E8E81]',
    };
  }

  if (theme === 'forest') {
    if (isPinned) {
      return {
        bg: 'bg-[#EBF7F0] hover:bg-[#E2F3E9]',
        border: 'border-[#BADEC7] shadow-xs',
        accent: 'text-[#1F5435]',
        pinFill: 'fill-[#3B7D57] text-[#3B7D57]',
      };
    }
    const tints = [
      { bg: 'bg-[#F2F8F4] hover:bg-[#E7F2EB]', border: 'border-[#D4E8DC]' },
      { bg: 'bg-[#F6FAF7] hover:bg-[#EDF5EF]', border: 'border-[#DFEEE5]' },
      { bg: 'bg-[#EBF4EE] hover:bg-[#DFEDE3]', border: 'border-[#CDE3D5]' },
      { bg: 'bg-[#EFF6F1] hover:bg-[#E3EFE6]', border: 'border-[#D6E7DC]' },
    ];
    const charCode = id.charCodeAt(0) || 0;
    return {
      ...tints[charCode % tints.length],
      accent: 'text-[#2D4D39]',
      pinFill: 'text-[#7D9485]',
    };
  }

  // Default Sky Theme
  if (isPinned) {
    return {
      bg: 'bg-amber-50/90 hover:bg-amber-100/70',
      border: 'border-amber-200 shadow-xs',
      accent: 'text-amber-800',
      pinFill: 'fill-amber-600 text-amber-600',
    };
  }
  const tints = [
    { bg: 'bg-sky-50/50 hover:bg-sky-50/80', border: 'border-sky-200/70' },
    { bg: 'bg-slate-50/60 hover:bg-slate-50/90', border: 'border-slate-200/70' },
    { bg: 'bg-indigo-50/40 hover:bg-indigo-50/70', border: 'border-indigo-200/70' },
    { bg: 'bg-teal-50/40 hover:bg-teal-50/70', border: 'border-teal-200/70' },
  ];
  const charCode = id.charCodeAt(0) || 0;
  return {
    ...tints[charCode % tints.length],
    accent: 'text-slate-700',
    pinFill: 'text-slate-400',
  };
};

export const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete }) => {
  const { theme } = useApp();
  const themeColors = getThemeColors(theme);
  const [copied, setCopied] = useState(false);

  const tint = getNoteTint(note.id, note.isPinned, theme);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = note.title ? `【${note.title}】\n${note.content}` : note.content;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 shadow-xs flex flex-col justify-between ${tint.bg} ${tint.border}`}
    >
      <div>
        {/* Card Header with Pin and Quick Actions */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {note.isPinned && (
              <Pin className={`w-3.5 h-3.5 shrink-0 ${tint.pinFill}`} />
            )}
            <h4 className={`text-xs font-semibold ${themeColors.textMain} truncate`}>
              {note.title || '无标题便签'}
            </h4>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              title="复制便签文本"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => onEdit(note)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
              title="编辑便签"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(note.id)}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
              title="删除便签"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <p className={`text-xs ${themeColors.textMuted} whitespace-pre-line line-clamp-5 leading-relaxed`}>
          {note.content}
        </p>
      </div>

      {/* Footer Tags & Updated Time */}
      <div className={`flex items-center justify-between mt-3 pt-2 border-t border-black/5 text-[10px] ${themeColors.textSub}`}>
        <span className="font-mono">{note.updatedAt?.slice(0, 10) || '今日'}</span>
        <div className="flex flex-wrap gap-1">
          {(note.tags || []).map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded-md bg-white/70 text-slate-600 border border-slate-200/50 font-medium"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
