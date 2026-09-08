// src/components/checkin/TopCalendarStrip.tsx
import React, { useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getLunarDisplay } from '../../utils/lunarUtil';
import { getThemeColors } from '../../utils/themeStyles';

interface TopCalendarStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onOpenDayDetail?: (dateStr: string) => void;
}

export const TopCalendarStrip: React.FC<TopCalendarStripProps> = ({
  selectedDate,
  onSelectDate,
  onOpenDayDetail,
}) => {
  const { checkInRecords, theme } = useApp();
  const themeColors = getThemeColors(theme);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate rolling 14-day window: 7 days before selectedDate/today to 6 days after
  const dates = useMemo(() => {
    const baseDate = new Date(selectedDate || todayStr);
    const result: { dateStr: string; dateObj: Date; dayOfWeek: string; isToday: boolean }[] = [];
    const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    for (let offset = -6; offset <= 7; offset++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + offset);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        dateStr,
        dateObj: d,
        dayOfWeek: WEEK_DAYS[d.getDay()],
        isToday: dateStr === todayStr,
      });
    }
    return result;
  }, [selectedDate, todayStr]);

  // Check in counts map
  const recordsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of checkInRecords) {
      map.set(r.date, (map.get(r.date) || 0) + 1);
    }
    return map;
  }, [checkInRecords]);

  // Auto-center selected date in scroll container
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-selected="true"]') as HTMLElement;
      if (activeEl) {
        const container = scrollRef.current;
        const scrollLeft =
          activeEl.offsetLeft - container.offsetWidth / 2 + activeEl.offsetWidth / 2;
        container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
      }
    }
  }, [selectedDate]);

  const isSelectedToday = selectedDate === todayStr;
  const isSelectedPast = selectedDate < todayStr;
  const isSelectedFuture = selectedDate > todayStr;
  const selDateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }, [selectedDate]);

  const lunar = useMemo(() => getLunarDisplay(selDateObj), [selDateObj]);

  const handleDateClick = (dateStr: string) => {
    if (dateStr === selectedDate) {
      // Tapping already selected date opens detail
      if (onOpenDayDetail) {
        onOpenDayDetail(dateStr);
      }
    } else {
      onSelectDate(dateStr);
    }
  };

  return (
    <div className="space-y-1.5">
      {/* Date Header Info Bar (Compact & Clickable) */}
      <div className="flex items-center justify-between text-xs px-0.5">
        <button
          type="button"
          onClick={() => onOpenDayDetail && onOpenDayDetail(selectedDate)}
          className="flex items-center gap-1.5 font-semibold text-slate-700 hover:opacity-80 transition-opacity text-left group"
          title="点击查看当日打卡详情流水"
        >
          <CalendarIcon className={`w-3.5 h-3.5 ${themeColors.primaryText} group-hover:scale-110 transition-transform`} />
          <span className="text-xs">
            {selDateObj.getMonth() + 1}月{selDateObj.getDate()}日
          </span>
          <span className={`text-[10px] ${themeColors.textSub} font-normal`}>
            （{lunar.text}）
          </span>
          <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200/60 font-normal group-hover:bg-sky-100 flex items-center gap-0.5">
            <Info className="w-2.5 h-2.5" />
            <span>详情</span>
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          {!isSelectedToday && (
            <button
              type="button"
              onClick={() => onSelectDate(todayStr)}
              className={`flex items-center gap-0.5 text-[10px] ${themeColors.primaryText} font-medium px-2 py-0.5 rounded-full ${themeColors.subtleBg} border ${themeColors.subtleBorder} hover:opacity-80 active:scale-95 transition-all`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>回今天</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Strip: Sleeker, smaller height to preserve screen real estate */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5 no-scrollbar scroll-smooth px-0.5"
      >
        {dates.map((item) => {
          const isSelected = item.dateStr === selectedDate;
          const count = recordsMap.get(item.dateStr) || 0;
          const hasRecord = count > 0;
          const isItemPast = item.dateStr < todayStr;

          return (
            <button
              key={item.dateStr}
              type="button"
              data-selected={isSelected}
              onClick={() => handleDateClick(item.dateStr)}
              className={`flex-shrink-0 flex flex-col items-center justify-between w-10.5 py-1 px-0.5 rounded-xl border transition-all text-center select-none ${
                isSelected
                  ? `${themeColors.badgeBg} border-2 ${themeColors.primaryBorder} shadow-2xs scale-102`
                  : item.isToday
                  ? `${themeColors.cardBg} border-amber-300 shadow-2xs hover:${themeColors.subtleBg}`
                  : `${themeColors.cardBg} ${themeColors.subtleBorder} hover:${themeColors.subtleBg}`
              }`}
            >
              <span
                className={`text-[9px] font-medium leading-none ${
                  isSelected ? themeColors.primaryText : 'text-slate-400'
                }`}
              >
                {item.isToday ? '今天' : item.dayOfWeek.slice(1)}
              </span>

              <span
                className={`text-xs font-bold font-mono my-0.5 leading-tight ${
                  isSelected
                    ? `${themeColors.primaryText} font-extrabold`
                    : item.isToday
                    ? 'text-amber-700'
                    : isItemPast
                    ? 'text-slate-600'
                    : 'text-slate-400'
                }`}
              >
                {item.dateObj.getDate()}
              </span>

              {/* Status Dot */}
              <div className="h-1 flex items-center justify-center">
                {hasRecord ? (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-emerald-600' : 'bg-emerald-500'
                    }`}
                    title={`打卡 ${count} 项`}
                  />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
