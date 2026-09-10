// src/components/checkin/CollapsibleCheckInList.tsx
import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sliders,
  Calendar,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TopCalendarStrip } from './TopCalendarStrip';
import { CheckInCapsuleItem } from './CheckInCapsuleItem';
import { DayCheckInDetailModal } from './DayCheckInDetailModal';
import { CheckInType } from '../../types';
import { getThemeColors } from '../../utils/themeStyles';
import { formatLocalDate } from '../../utils/dateUtil';
import { isHabitScheduledForDate } from '../../utils/habitScheduleUtil';

interface CollapsibleCheckInListProps {
  onOpenManageHabits?: () => void;
}

export const CollapsibleCheckInList: React.FC<CollapsibleCheckInListProps> = ({
  onOpenManageHabits,
}) => {
  const { checkInTypes, getRecordsByDate, toggleCheckIn, setActiveTab, theme } = useApp();
  const themeColors = getThemeColors(theme);

  const todayStr = useMemo(() => formatLocalDate(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isCollapsedCard, setIsCollapsedCard] = useState<boolean>(false);
  const [detailModalDate, setDetailModalDate] = useState<string | null>(null);

  // Check-in records for currently selected date
  const dateRecords = useMemo(() => {
    return getRecordsByDate(selectedDate);
  }, [getRecordsByDate, selectedDate]);

  const recordsMap = useMemo(() => {
    const map = new Map<string, typeof dateRecords[0]>();
    for (const r of dateRecords) {
      map.set(r.typeId, r);
    }
    return map;
  }, [dateRecords]);

  // 根据用户设定的周期筛选当天的打卡按钮：
  // 1. 启用的习惯
  // 2. 符合当天周期的习惯（若未设定则默认每天），或当天已有记录的习惯（确保成果不丢失）
  const scheduledTypes = useMemo(() => {
    return checkInTypes.filter((t) => {
      if (!t.enabled) return false;
      if (recordsMap.has(t.id)) return true;
      return isHabitScheduledForDate(t, selectedDate);
    });
  }, [checkInTypes, selectedDate, recordsMap]);

  // Statistics: 基于当天需要打卡的习惯项计算完成度
  const completedCount = useMemo(() => {
    return scheduledTypes.filter((t) => recordsMap.has(t.id)).length;
  }, [scheduledTypes, recordsMap]);

  const totalCount = scheduledTypes.length;

  // Date status
  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;
  const isFuture = selectedDate > todayStr;

  const handleToggle = (type: CheckInType, mode: 'overwrite' | 'toggle' = 'overwrite') => {
    if (!isToday) {
      // Direct user protection
      setDetailModalDate(selectedDate);
      return;
    }
    toggleCheckIn(selectedDate, type, mode);
  };

  return (
    <>
      <div
        className={`${themeColors.cardBg} rounded-2xl p-3 border ${themeColors.cardBorder} shadow-xs space-y-2.5 transition-colors`}
      >
        {/* Top Calendar Strip (Compact) */}
        <TopCalendarStrip
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            // If selecting a past date, user can immediately see notice or tap to view detail
          }}
          onOpenDayDetail={(date) => setDetailModalDate(date)}
        />

        {/* Header Bar with Space-Saving Collapse Button */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${themeColors.textMain}`}>
              {isToday ? '今日打卡' : `${selectedDate.slice(5)} 打卡`}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                completedCount === totalCount && totalCount > 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : `${themeColors.subtleBg} ${themeColors.primaryText}`
              }`}
            >
              {completedCount}/{totalCount} 项完成
            </span>

            {/* Quick check-in detail modal trigger */}
            <button
              type="button"
              onClick={() => setDetailModalDate(selectedDate)}
              className="text-[10px] text-sky-600 hover:text-sky-700 flex items-center gap-0.5 ml-0.5"
              title="查看当日完整打卡明细与时间点"
            >
              <Eye className="w-2.5 h-2.5" />
              <span>明细</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            {/* 收起/展开整个卡片列表，释放主页纵向空间 */}
            <button
              type="button"
              onClick={() => setIsCollapsedCard(!isCollapsedCard)}
              className="text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
              title={isCollapsedCard ? '展开打卡列表' : '收起打卡列表，节省屏幕空间'}
            >
              {isCollapsedCard ? (
                <>
                  <span>展开列表</span>
                  <ChevronDown className="w-3 h-3" />
                </>
              ) : (
                <>
                  <span>折叠收起</span>
                  <ChevronUp className="w-3 h-3" />
                </>
              )}
            </button>

            <span className="text-slate-200">|</span>

            {onOpenManageHabits && (
              <button
                type="button"
                onClick={onOpenManageHabits}
                className={`text-[11px] ${themeColors.primaryText} hover:opacity-80 flex items-center gap-0.5 font-medium transition-opacity`}
                title="设置习惯项目与提醒时间"
              >
                <Sliders className="w-3 h-3" />
                <span>管理</span>
              </button>
            )}

            <span className="text-slate-200">|</span>

            <button
              type="button"
              onClick={() => setActiveTab('review')}
              className={`text-[11px] ${themeColors.primaryText} hover:opacity-80 flex items-center gap-0.5 font-medium transition-opacity`}
              title="前往打卡日历全景"
            >
              <span>日历</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Date Restriction Warning Banners */}
        {isPast && (
          <div
            onClick={() => setDetailModalDate(selectedDate)}
            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 cursor-pointer hover:bg-slate-100/80 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>历史记录仅供查阅，不可改写。已打卡 {completedCount} 项。</span>
            </div>
            <span className="text-sky-600 font-medium shrink-0 ml-1">查看流水 →</span>
          </div>
        )}

        {isFuture && (
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>未来日期尚未到达，不可预支打卡。请在当天记录打卡时间。</span>
          </div>
        )}

        {/* Habit Row Section: Habits arranged in a horizontal side-by-side row */}
        {!isCollapsedCard && (
          <>
            {scheduledTypes.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-slate-200 rounded-2xl">
                <p className="text-xs text-slate-400">
                  {checkInTypes.some((t) => t.enabled)
                    ? '今日设定的周期无需打卡，享受当下节奏'
                    : '暂无启用的打卡项'}
                </p>
                {onOpenManageHabits && (
                  <button
                    type="button"
                    onClick={onOpenManageHabits}
                    className={`mt-1.5 text-xs font-semibold ${themeColors.primaryText} hover:underline`}
                  >
                    管理习惯与周期
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-0.5">
                {scheduledTypes.map((type) => (
                  <CheckInCapsuleItem
                    key={type.id}
                    type={type}
                    selectedDate={selectedDate}
                    record={recordsMap.get(type.id)}
                    onToggle={handleToggle}
                    onOpenDayDetail={() => setDetailModalDate(selectedDate)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 当日打卡详情弹窗（支持系统返回按键） */}
      <DayCheckInDetailModal
        isOpen={!!detailModalDate}
        onClose={() => setDetailModalDate(null)}
        dateStr={detailModalDate || selectedDate}
        onSelectDate={(d) => {
          setSelectedDate(d);
          setDetailModalDate(null);
        }}
      />
    </>
  );
};
