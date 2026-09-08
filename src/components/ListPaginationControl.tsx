// src/components/ListPaginationControl.tsx
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getThemeColors } from '../utils/themeStyles';

interface ListPaginationControlProps {
  totalCount: number;
  visibleCount: number;
  pageSize?: number;
  onShowMore: () => void;
  onCollapse: () => void;
  itemName?: string;
}

export const ListPaginationControl: React.FC<ListPaginationControlProps> = ({
  totalCount,
  visibleCount,
  pageSize = 10,
  onShowMore,
  onCollapse,
  itemName = '条',
}) => {
  const { theme } = useApp();
  const themeColors = getThemeColors(theme);

  // 若总数小于等于 10 条，两个菜单都消失
  if (totalCount <= pageSize) {
    return null;
  }

  const hasMore = visibleCount < totalCount;
  const isExpanded = visibleCount > pageSize;
  const nextBatchCount = Math.min(pageSize, totalCount - visibleCount);

  return (
    <div className="pt-3 pb-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
      <span className={`text-[11px] ${themeColors.textSub} font-medium`}>
        已显示 {Math.min(visibleCount, totalCount)} / {totalCount} {itemName}
      </span>

      <div className="flex items-center gap-2">
        {/* 点击多显示 10 条 */}
        {hasMore && (
          <button
            type="button"
            onClick={onShowMore}
            className={`flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-all shadow-2xs ${themeColors.subtleBg} ${themeColors.primaryText} border ${themeColors.subtleBorder} hover:opacity-90 active:scale-98`}
          >
            <span>展开更多 (+{nextBatchCount})</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 在更多的旁边显示收缩 */}
        {isExpanded && (
          <button
            type="button"
            onClick={onCollapse}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${themeColors.cardBg} ${themeColors.textMuted} border-slate-200 hover:${themeColors.textMain} hover:bg-slate-50 active:scale-98`}
          >
            <span>收起</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
