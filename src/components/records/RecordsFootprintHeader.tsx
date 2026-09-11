// src/components/records/RecordsFootprintHeader.tsx
import React from 'react';
import { BookOpen, Camera, FileText, Plus, Sparkles } from 'lucide-react';
import { ThemeColors } from '../../utils/themeStyles';

interface RecordsFootprintHeaderProps {
  memoriesCount: number;
  notesCount: number;
  photosCount: number;
  themeColors: ThemeColors;
  onOpenMemoryCreate: () => void;
  onOpenNoteCreate: () => void;
}

export const RecordsFootprintHeader: React.FC<RecordsFootprintHeaderProps> = ({
  memoriesCount,
  notesCount,
  photosCount,
  themeColors,
  onOpenMemoryCreate,
  onOpenNoteCreate,
}) => {
  return (
    <div className={`p-4 rounded-2xl ${themeColors.cardBg} border ${themeColors.cardBorder} shadow-xs space-y-3`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className={`text-base font-semibold ${themeColors.textMain}`}>生活印记与灵感库</h2>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className={`text-xs ${themeColors.textSub} mt-0.5`}>
            客观事实记录 · 图文留存 · 随手便签灵感
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNoteCreate}
            className={`flex items-center gap-1 px-3 py-1.5 ${themeColors.subtleBg} ${themeColors.subtleHoverBg} ${themeColors.textMain} text-xs font-medium rounded-xl border ${themeColors.subtleBorder} shadow-2xs transition-all`}
            title="记便签"
          >
            <Plus className="w-3.5 h-3.5 opacity-70" />
            <span>便签</span>
          </button>
          <button
            onClick={onOpenMemoryCreate}
            className={`flex items-center gap-1.5 px-3 py-1.5 ${themeColors.actionBtn} text-white text-xs font-medium rounded-xl shadow-xs hover:opacity-90 transition-all`}
            title="写记录"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>写记录</span>
          </button>
        </div>
      </div>

      {/* Footprint Counts Thematic Pills */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${themeColors.statPillBg} border ${themeColors.statPillBorder} transition-all`}>
          <div className={`p-1.5 rounded-lg ${themeColors.subtleBg} ${themeColors.primaryText}`}>
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className={`text-[10.5px] ${themeColors.textSub} font-medium`}>日记记录</div>
            <div className={`text-base font-bold font-mono tracking-tight ${themeColors.textMain}`}>{memoriesCount} <span className="text-[11px] font-normal font-sans opacity-75">篇</span></div>
          </div>
        </div>

        <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${themeColors.statPillBg} border ${themeColors.statPillBorder} transition-all`}>
          <div className={`p-1.5 rounded-lg ${themeColors.accentCoolBg} ${themeColors.accentCoolText}`}>
            <Camera className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className={`text-[10.5px] ${themeColors.textSub} font-medium`}>生活相片</div>
            <div className={`text-base font-bold font-mono tracking-tight ${themeColors.textMain}`}>{photosCount} <span className="text-[11px] font-normal font-sans opacity-75">张</span></div>
          </div>
        </div>

        <div className={`flex items-center gap-2.5 p-2.5 rounded-xl ${themeColors.statPillBg} border ${themeColors.statPillBorder} transition-all`}>
          <div className={`p-1.5 rounded-lg ${themeColors.accentWarmBg} ${themeColors.accentWarmText}`}>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className={`text-[10.5px] ${themeColors.textSub} font-medium`}>便签备忘</div>
            <div className={`text-base font-bold font-mono tracking-tight ${themeColors.textMain}`}>{notesCount} <span className="text-[11px] font-normal font-sans opacity-75">条</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
