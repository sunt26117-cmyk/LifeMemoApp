// src/components/review/ReviewCalendarTab.tsx
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getLunarDisplay } from '../../utils/lunarUtil';
import { ManageHabitsModal } from './ManageHabitsModal';
import { DayCheckInDetailModal } from '../checkin/DayCheckInDetailModal';
import { getThemeColors } from '../../utils/themeStyles';
import { formatLocalDate } from '../../utils/dateUtil';

export const ReviewCalendarTab: React.FC = () => {
  const { checkInRecords, checkInTypes, toggleCheckIn, statAnchorDate, theme } = useApp();
  const themeColors = getThemeColors(theme);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [showManageTypesModal, setShowManageTypesModal] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);

  const todayStr = formatLocalDate(new Date());
  const anchorDateStr = statAnchorDate ? statAnchorDate.split('T')[0] : null;

  // Filter checkInRecords by statAnchorDate
  const validCheckInRecords = useMemo(() => {
    if (!anchorDateStr) return checkInRecords;
    return checkInRecords.filter((r) => r.date >= anchorDateStr);
  }, [checkInRecords, anchorDateStr]);

  // Calculate Streak (连续打卡天数，受锚点过滤约束)
  const streak = useMemo(() => {
    const datesSet = new Set(validCheckInRecords.map((r) => r.date));
    let count = 0;
    const checkDate = new Date();
    // Check today first, if not checked yet check yesterday
    const todayFormatted = formatLocalDate(checkDate);
    if (!datesSet.has(todayFormatted)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const dStr = formatLocalDate(checkDate);
      if (anchorDateStr && dStr < anchorDateStr) break;
      if (datesSet.has(dStr)) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [validCheckInRecords, anchorDateStr]);

  // Calendar Month Days
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startWeekDay = firstDay.getDay(); // 0 = Sun
    const totalDays = lastDay.getDate();

    const days: { dateStr: string; dateObj: Date; isCurrentMonth: boolean }[] = [];

    // Preceding padding
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ dateStr: formatLocalDate(d), dateObj: d, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        dateStr: formatLocalDate(dateObj),
        dateObj,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [currentMonthDate]);

  return (
    <div className="space-y-4">
      <div className={`${themeColors.cardBg} p-4 rounded-2xl border ${themeColors.cardBorder} shadow-xs`}>
        {/* Calendar Month Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setCurrentMonthDate(
                  new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
                )
              }
              className={`p-1 ${themeColors.subtleBg} hover:opacity-80 rounded-lg ${themeColors.textMain} transition-colors border ${themeColors.subtleBorder}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className={`text-xs font-semibold ${themeColors.textMain}`}>
              {currentMonthDate.getFullYear()}年 {currentMonthDate.getMonth() + 1}月
            </h3>
            <button
              onClick={() =>
                setCurrentMonthDate(
                  new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
                )
              }
              className={`p-1 ${themeColors.subtleBg} hover:opacity-80 rounded-lg ${themeColors.textMain} transition-colors border ${themeColors.subtleBorder}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100/70 text-amber-800 font-semibold border border-amber-300">
              🔥 连续打卡 {streak} 天
            </span>
            <button
              onClick={() => setShowManageTypesModal(true)}
              className={`text-[11px] ${themeColors.primaryText} hover:underline font-medium`}
            >
              管理习惯
            </button>
          </div>
        </div>

        {/* Weekdays */}
        <div className={`grid grid-cols-7 gap-1 text-center text-[11px] font-semibold ${themeColors.textSub} mb-1`}>
          {['日', '一', '二', '三', '四', '五', '六'].map((w, idx) => (
            <div key={idx} className={idx === 0 || idx === 6 ? 'text-rose-500 font-semibold' : ''}>
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((item, idx) => {
            const isToday = item.dateStr === todayStr;
            const lunar = getLunarDisplay(item.dateObj);
            const dayRecords = validCheckInRecords.filter((r) => r.date === item.dateStr);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDayDetail(item.dateStr)}
                title={`点击查看 ${item.dateStr} 当日打卡详情与时间点`}
                className={`min-h-[52px] p-1 rounded-xl flex flex-col items-center justify-between transition-all border text-center cursor-pointer active:scale-95 ${
                  !item.isCurrentMonth
                    ? 'opacity-30 border-transparent'
                    : isToday
                    ? `${themeColors.badgeBg} border-2 ${themeColors.primaryBorder} shadow-2xs font-bold`
                    : `${themeColors.cardBorder} ${themeColors.subtleHoverBg}`
                }`}
              >
                <span
                  className={`text-[11px] font-semibold ${
                    isToday ? themeColors.primaryText : item.isCurrentMonth ? themeColors.textMain : themeColors.textSub
                  }`}
                >
                  {item.dateObj.getDate()}
                </span>

                {/* Lunar or Festival */}
                <span
                  className={`text-[9px] truncate max-w-full ${
                    lunar.isFestival ? 'text-rose-500 font-medium' : themeColors.textSub
                  }`}
                >
                  {lunar.text}
                </span>

                {/* Checkin Dots */}
                <div className="flex gap-0.5 h-2 items-center">
                  {dayRecords.slice(0, 3).map((r, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]" />
                  ))}
                  {dayRecords.length > 3 && (
                    <span className={`w-1 h-1 rounded-full ${themeColors.textSub}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today Habits Toggle Panel */}
      <div className={`${themeColors.cardBg} p-4 rounded-2xl border ${themeColors.cardBorder} shadow-xs`}>
        <h4 className={`text-xs font-semibold ${themeColors.textMain} mb-2`}>
          今日习惯打卡清单 ({todayStr})
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {checkInTypes.filter((t) => t.enabled).map((type) => {
            const isChecked = checkInRecords.some(
              (r) => r.date === todayStr && r.typeId === type.id
            );
            return (
              <button
                key={type.id}
                onClick={() => toggleCheckIn(todayStr, type)}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all ${
                  isChecked
                    ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 shadow-xs'
                    : `${themeColors.subtleBg} ${themeColors.subtleBorder} ${themeColors.textMain} hover:border-slate-300`
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-base">{type.symbol}</span>
                  <span>{type.name}</span>
                </span>
                {isChecked ? (
                  <CheckCircle2 className="w-4 h-4 text-[#4CAF50]" />
                ) : (
                  <span className={`w-4 h-4 rounded-full border ${themeColors.cardBorder} ${themeColors.cardBg}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <ManageHabitsModal
        isOpen={showManageTypesModal}
        onClose={() => setShowManageTypesModal(false)}
      />

      <DayCheckInDetailModal
        isOpen={!!selectedDayDetail}
        onClose={() => setSelectedDayDetail(null)}
        dateStr={selectedDayDetail || todayStr}
      />
    </div>
  );
};
