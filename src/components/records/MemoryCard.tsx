// src/components/records/MemoryCard.tsx
import React from 'react';
import { Edit2, Sparkles, Trash2, MapPin, Calendar, Clock } from 'lucide-react';
import { Memory } from '../../types';
import { useApp } from '../../context/AppContext';
import { getThemeColors } from '../../utils/themeStyles';

interface MemoryCardProps {
  memory: Memory;
  onEdit: (m: Memory) => void;
  onDelete: (id: string) => void;
}

function parseMemoryDate(dateStr?: string) {
  if (!dateStr) return { day: '01', monthWeekday: '日常记录', time: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const raw = dateStr.slice(0, 10);
    return { day: raw.slice(8, 10) || '01', monthWeekday: raw.slice(5, 7) + '月', time: dateStr.slice(11, 16) };
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.getMonth() + 1;
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[d.getDay()];
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { day, monthWeekday: `${month}月 · ${weekday}`, time };
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

  const { day, monthWeekday, time } = parseMemoryDate(memory.createdAt);

  return (
    <div
      className={`p-4 ${themeColors.cardBg} rounded-2xl border ${themeColors.cardBorder} shadow-xs ${themeColors.cardHoverBorder} transition-all`}
    >
      <div className="flex items-start gap-3">
        {/* Left Date Badge Pillar */}
        <div className={`shrink-0 flex flex-col items-center justify-center w-12 py-1.5 rounded-xl ${themeColors.statPillBg} border ${themeColors.statPillBorder} text-center select-none shadow-2xs`}>
          <span className={`text-base font-bold font-mono tracking-tight ${themeColors.textMain} leading-none`}>{day}</span>
          <span className={`text-[10px] font-medium ${themeColors.textSub} mt-1 leading-tight`}>{monthWeekday}</span>
          {time && <span className={`text-[9px] font-mono ${themeColors.textSub} opacity-80 mt-0.5`}>{time}</span>}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <h4 className={`text-sm font-semibold ${themeColors.textMain} leading-snug tracking-tight`}>
                {memory.title || '日常事实记录'}
              </h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {memory.locationName && (
                  <span className={`inline-flex items-center gap-0.5 text-[11px] ${themeColors.accentGreenText} ${themeColors.accentGreenBg} px-1.5 py-0.5 rounded-md border border-emerald-200/40 font-medium`}>
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate max-w-[140px]">{memory.locationName}</span>
                  </span>
                )}
                {time && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] ${themeColors.textSub} font-mono opacity-80`}>
                    <Clock className="w-2.5 h-2.5" />
                    {time}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(memory)}
                className={`p-1.5 ${themeColors.textSub} hover:${themeColors.textMain} ${themeColors.subtleHoverBg} rounded-lg transition-colors`}
                title="编辑记录"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(memory.id)}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50/80 rounded-lg transition-colors"
                title="删除记录"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Body Text */}
          <p className={`text-xs sm:text-[13px] ${themeColors.textMuted} leading-relaxed mb-3 whitespace-pre-line break-words`}>
            {memory.content}
          </p>

          {/* Moments-style Photo Gallery */}
          {displayPhotos.length > 0 && (
            <div
              className={`grid gap-2 mb-3 ${
                displayPhotos.length === 1
                  ? 'grid-cols-1 max-w-[240px]'
                  : displayPhotos.length === 2
                  ? 'grid-cols-2 max-w-[320px]'
                  : 'grid-cols-3 max-w-[400px]'
              }`}
            >
              {displayPhotos.map((src, idx) => (
                <div
                  key={idx}
                  onClick={() => openPhotoPreview(src, memory.title || undefined)}
                  className={`group relative aspect-square rounded-xl overflow-hidden ${themeColors.subtleBg} border ${themeColors.subtleBorder} cursor-pointer shadow-2xs hover:shadow-md transition-all duration-200`}
                  title="点击全屏查看"
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}

          {/* AI Objective Fact Summary Quote Box */}
          {memory.aiSummary && (
            <div className={`p-2.5 ${themeColors.quoteBoxBg} border-l-3 ${themeColors.quoteBoxBorder} rounded-r-xl mb-3 flex items-start gap-2 shadow-2xs`}>
              <Sparkles className={`w-3.5 h-3.5 ${themeColors.quoteBoxText} shrink-0 mt-0.5`} />
              <div className={`text-xs ${themeColors.textMain} leading-relaxed`}>
                <span className={`font-semibold ${themeColors.quoteBoxText} mr-1`}>AI 客观事实提炼：</span>
                {memory.aiSummary}
              </div>
            </div>
          )}

          {/* Tags */}
          {memory.tags && memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {memory.tags.map((t) => (
                <span
                  key={t}
                  className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium ${themeColors.subtleBg} ${themeColors.textSub} border ${themeColors.subtleBorder}`}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
