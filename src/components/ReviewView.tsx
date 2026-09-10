// src/components/ReviewView.tsx
import React, { useState } from 'react';
import { Award, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { Reflection } from '../types';
import { ReviewReflectionsTab } from './review/ReviewReflectionsTab';
import { ReviewCalendarTab } from './review/ReviewCalendarTab';
import { ReviewTrendsTab } from './review/ReviewTrendsTab';
import { ReviewSummaryTab } from './review/ReviewSummaryTab';
import { useApp } from '../context/AppContext';
import { getThemeColors } from '../utils/themeStyles';

interface ReviewViewProps {
  onOpenReflectionCreate: () => void;
  onOpenReflectionEdit: (r: Reflection) => void;
  onUnlockBiometric: () => void;
  onOpenTaskCreate: (title: string) => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  onOpenReflectionCreate,
  onOpenReflectionEdit,
  onUnlockBiometric,
  onOpenTaskCreate,
}) => {
  const { theme } = useApp();
  const themeColors = getThemeColors(theme);

  const [reviewSubTab, setReviewSubTab] = useState<'calendar' | 'reflections' | 'trends' | 'summary'>(
    'calendar'
  );

  return (
    <div className="space-y-4 pb-20">
      {/* 4 Sub-Tabs */}
      <div className={`flex p-1 ${themeColors.segmentBg} rounded-2xl gap-1`}>
        {[
          { id: 'calendar', label: '打卡日历', icon: Calendar },
          { id: 'reflections', label: '反思记录', icon: Sparkles },
          { id: 'trends', label: '成长趋势', icon: TrendingUp },
          { id: 'summary', label: '周期总结', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reviewSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReviewSubTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-medium rounded-xl transition-all cursor-pointer active:scale-95 ${
                isActive
                  ? `${themeColors.segmentActiveBg} ${themeColors.segmentActiveText} shadow-xs font-semibold`
                  : `${themeColors.textMuted} hover:text-slate-800`
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {reviewSubTab === 'reflections' && (
        <ReviewReflectionsTab
          onOpenReflectionCreate={onOpenReflectionCreate}
          onOpenReflectionEdit={onOpenReflectionEdit}
          onUnlockBiometric={onUnlockBiometric}
          onOpenTaskCreate={onOpenTaskCreate}
        />
      )}

      {reviewSubTab === 'calendar' && <ReviewCalendarTab />}

      {reviewSubTab === 'trends' && <ReviewTrendsTab />}

      {reviewSubTab === 'summary' && <ReviewSummaryTab />}
    </div>
  );
};
