// src/components/records/MemoryCard.tsx
import React from 'react';
import { Edit2, Sparkles, Trash2, MapPin } from 'lucide-react';
import { Memory } from '../../types';
import { useApp } from '../../context/AppContext';
import { getThemeColors } from '../../utils/themeStyles';

interface MemoryCardProps {
  memory: Memory;
  onEdit: (m: Memory) => void;
  onDelete: (id: string) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onEdit, onDelete }) => {
  const { photos, openPhotoPreview, theme } = useApp();
  const themeColors = getThemeColors(theme);

  // Gather photos from memory.photos array and memory.relatedMediaIds
  const displayPhotos: string[] = [];
  if (memory.photos && memory.photos.length > 0) {
    displayPhotos.push(...memory.photos);
  }
  if (memory.relatedMediaIds && memory.relatedMediaIds.length > 0) {
    memory.relatedMediaIds.forEach((id) => {
      const found = photos.find((p) => p.id === id);
      if (found && !displayPhotos.includes(found.localPath)) {
        displayPhotos.push(found.localPath);
      }
    });
  }

  return (
    <div className={`p-4 ${themeColors.cardBg} rounded-2xl border ${themeColors.cardBorder} shadow-xs ${themeColors.cardHoverBorder} transition-colors`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className={`text-xs font-semibold ${themeColors.textMain}`}>{memory.title}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] ${themeColors.textSub}`}>
              {memory.createdAt.slice(0, 16).replace('T', ' ')}
            </span>
            {memory.locationName && (
              <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium">
                <MapPin className="w-2.5 h-2.5" />
                {memory.locationName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(memory)}
            className={`p-1 ${themeColors.textSub} hover:${themeColors.textMain} rounded-md transition-colors`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(memory.id)}
            className={`p-1 ${themeColors.textSub} hover:text-rose-500 rounded-md transition-colors`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className={`text-xs ${themeColors.textMuted} leading-relaxed mb-2.5 whitespace-pre-line`}>
        {memory.content}
      </p>

      {/* Moments-style Photo Grid */}
      {displayPhotos.length > 0 && (
        <div
          className={`grid gap-1.5 mb-2.5 ${
            displayPhotos.length === 1
              ? 'grid-cols-1 max-w-[200px]'
              : displayPhotos.length === 2
              ? 'grid-cols-2 max-w-[280px]'
              : 'grid-cols-3 max-w-[360px]'
          }`}
        >
          {displayPhotos.map((src, idx) => (
            <div
              key={idx}
              onClick={() => openPhotoPreview(src, memory.title || undefined)}
              className={`aspect-square rounded-xl overflow-hidden ${themeColors.subtleBg} border ${themeColors.subtleBorder} cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all`}
              title="点击全屏查看大图"
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* AI Summary Badge */}
      {memory.aiSummary && (
        <div className="p-2 bg-purple-100/50 border border-purple-200/70 rounded-xl mb-2.5 flex items-start gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-700">
            <span className="font-semibold text-purple-700">AI 客观事实摘要：</span>
            {memory.aiSummary}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {memory.tags.map((t) => (
          <span
            key={t}
            className={`text-[10px] px-2 py-0.5 ${themeColors.badgeBg} ${themeColors.badgeText} rounded-full font-medium`}
          >
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
};
