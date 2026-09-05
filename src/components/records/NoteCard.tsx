// src/components/records/NoteCard.tsx
import React from 'react';
import { Edit2, Pin, Trash2 } from 'lucide-react';
import { Note } from '../../types';
import { useApp } from '../../context/AppContext';
import { getThemeColors } from '../../utils/themeStyles';

interface NoteCardProps {
  note: Note;
  onEdit: (n: Note) => void;
  onDelete: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete }) => {
  const { theme } = useApp();
  const themeColors = getThemeColors(theme);

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all ${
        note.isPinned
          ? 'bg-amber-100/60 border-amber-200 shadow-xs'
          : `${themeColors.cardBg} ${themeColors.cardBorder} shadow-xs ${themeColors.cardHoverBorder}`
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {note.isPinned && <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600 shrink-0" />}
          <h4 className={`text-xs font-semibold ${themeColors.textMain} truncate`}>{note.title}</h4>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(note)}
            className={`p-1 ${themeColors.textSub} hover:${themeColors.textMain} rounded-md transition-colors`}
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className={`p-1 ${themeColors.textSub} hover:text-rose-500 rounded-md transition-colors`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <p className={`text-xs ${themeColors.textMuted} whitespace-pre-line line-clamp-4 leading-relaxed`}>
        {note.content}
      </p>

      <div className={`flex items-center justify-between mt-2 pt-2 border-t ${themeColors.divider} text-[10px] ${themeColors.textSub}`}>
        <span>{note.updatedAt?.slice(0, 10)}</span>
        <div className="flex gap-1">
          {note.tags.map((t) => (
            <span key={t} className={`px-1.5 py-0.5 ${themeColors.subtleBg} ${themeColors.textMuted} rounded border ${themeColors.subtleBorder}`}>
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
