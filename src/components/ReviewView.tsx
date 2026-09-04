// src/components/ReviewView.tsx
import React, { useState } from 'react';
import { Award, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { Reflection } from '../types';
import { ReviewReflectionsTab } from './review/ReviewReflectionsTab';
import { ReviewCalendarTab } from './review/ReviewCalendarTab';
import { ReviewTrendsTab } from './review/ReviewTrendsTab';
import { ReviewSummaryTab } from './review/ReviewSummaryTab';

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
  const [reviewSubTab, setReviewSubTab] = useState<'reflections' | 'calendar' | 'trends' | 'summary'>(
    'reflections'
  );

  return (
    <div className="space-y-4 pb-20">
      {/* 4 Sub-Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
        {[
          { id: 'reflections', label: '反思记录', icon: Sparkles },
          { id: 'calendar', label: '打卡日历', icon: Calendar },
          { id: 'trends', label: '成长趋势', icon: TrendingUp },
          { id: 'summary', label: '周期总结', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reviewSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReviewSubTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-xs font-medium rounded-xl transition-all ${
                isActive
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
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
