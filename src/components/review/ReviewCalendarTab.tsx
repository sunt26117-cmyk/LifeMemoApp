// src/components/review/ReviewCalendarTab.tsx
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getLunarDisplay } from '../../utils/lunarUtil';
import { ManageHabitsModal } from './ManageHabitsModal';

export const ReviewCalendarTab: React.FC = () => {
  const { checkInRecords, checkInTypes, toggleCheckIn } = useApp();
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [showManageTypesModal, setShowManageTypesModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

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
      days.push({ dateStr: d.toISOString().split('T')[0], dateObj: d, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        dateStr: dateObj.toISOString().split('T')[0],
        dateObj,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [currentMonthDate]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        {/* Calendar Month Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setCurrentMonthDate(
                  new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
                )
              }
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-xs font-semibold text-slate-800">
              {currentMonthDate.getFullYear()}年 {currentMonthDate.getMonth() + 1}月
            </h3>
            <button
              onClick={() =>
                setCurrentMonthDate(
                  new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
                )
              }
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowManageTypesModal(true)}
            className="text-[11px] text-[#4A90D9] hover:underline font-medium"
          >
            管理习惯分类
          </button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-1">
          {['日', '一', '二', '三', '四', '五', '六'].map((w, idx) => (
            <div key={idx} className={idx === 0 || idx === 6 ? 'text-rose-400' : ''}>
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((item, idx) => {
            const isToday = item.dateStr === todayStr;
            const lunar = getLunarDisplay(item.dateObj);
            const dayRecords = checkInRecords.filter((r) => r.date === item.dateStr);

            return (
              <div
                key={idx}
                className={`min-h-[52px] p-1 rounded-xl flex flex-col items-center justify-between transition-colors border ${
                  !item.isCurrentMonth
                    ? 'opacity-30 border-transparent'
                    : isToday
                    ? 'bg-sky-50 border-[#4A90D9]/60'
                    : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`text-[11px] font-semibold ${
                    isToday ? 'text-[#4A90D9]' : item.isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {item.dateObj.getDate()}
                </span>

                {/* Lunar or Festival */}
                <span
                  className={`text-[9px] truncate max-w-full ${
                    lunar.isFestival ? 'text-rose-500 font-medium' : 'text-slate-400'
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
                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today Habits Toggle Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <h4 className="text-xs font-semibold text-slate-800 mb-2">
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
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-base">{type.symbol}</span>
                  <span>{type.name}</span>
                </span>
                {isChecked ? (
                  <CheckCircle2 className="w-4 h-4 text-[#4CAF50]" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300" />
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
    </div>
  );
};
