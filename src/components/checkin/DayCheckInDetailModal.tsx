// src/components/checkin/DayCheckInDetailModal.tsx
import React, { useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  X,
  CheckCircle2,
  Clock,
  Calendar,
  History,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getLunarDisplay } from '../../utils/lunarUtil';
import { getThemeColors } from '../../utils/themeStyles';
import { useModalBackHandler } from '../../services/modalBackManager';
import { formatLocalDate, parseLocalDate } from '../../utils/dateUtil';

interface DayCheckInDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string; // YYYY-MM-DD
  onSelectDate?: (date: string) => void;
}

export const DayCheckInDetailModal: React.FC<DayCheckInDetailModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  onSelectDate,
}) => {
  const { checkInTypes, checkInRecords, toggleCheckIn, theme } = useApp();
  const themeColors = getThemeColors(theme);

  // 1. 系统返回按键集成：注册到 modalBackManager 并在打开时压入历史栈
  useModalBackHandler(isOpen, onClose, 'day_checkin_detail_modal');

  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ modal: 'day_checkin_detail' }, '');
    }
  }, [isOpen]);

  const todayStr = useMemo(() => formatLocalDate(), []);
  const isToday = dateStr === todayStr;
  const isPast = dateStr < todayStr;
  const isFuture = dateStr > todayStr;

  const dateObj = useMemo(() => parseLocalDate(dateStr), [dateStr]);

  const lunar = useMemo(() => getLunarDisplay(dateObj), [dateObj]);

  const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekDayStr = WEEK_DAYS[dateObj.getDay()];

  // Records for this day
  const dayRecords = useMemo(() => {
    return checkInRecords.filter((r) => r.date === dateStr);
  }, [checkInRecords, dateStr]);

  const recordsMap = useMemo(() => {
    const map = new Map<string, typeof dayRecords[0]>();
    for (const r of dayRecords) {
      map.set(r.typeId, r);
    }
    return map;
  }, [dayRecords]);

  const enabledTypes = useMemo(() => {
    return checkInTypes.filter((t) => t.enabled);
  }, [checkInTypes]);

  const completedCount = enabledTypes.filter((t) => recordsMap.has(t.id)).length;
  const totalCount = enabledTypes.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Find earliest and latest check-in times
  const { earliestTime, latestTime } = useMemo(() => {
    const times = dayRecords
      .map((r) => r.checkInTime || (r.createdAt ? r.createdAt.slice(11, 16) : ''))
      .filter(Boolean)
      .sort();
    return {
      earliestTime: times[0] || null,
      latestTime: times[times.length - 1] || null,
    };
  }, [dayRecords]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-2xs animate-fadeIn">
      <div
        className={`w-full max-w-md ${themeColors.cardBg} rounded-3xl shadow-2xl border ${themeColors.cardBorder} flex flex-col max-h-[90vh] overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className={`p-4 border-b ${themeColors.cardBorder} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-full ${themeColors.subtleBg} hover:opacity-80 transition-opacity text-slate-600`}
              title="返回 (支持系统返回按键)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className={`text-base font-bold ${themeColors.textMain} flex items-center gap-1.5`}>
                <span>当日打卡详情</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isToday
                      ? 'bg-emerald-100 text-emerald-800'
                      : isPast
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isToday ? '今日可打卡' : isPast ? '历史记录 (只读)' : '未来日期'}
                </span>
              </h3>
              <p className={`text-xs ${themeColors.textSub} mt-0.5`}>
                {dateObj.getFullYear()}年{dateObj.getMonth() + 1}月{dateObj.getDate()}日 {weekDayStr} · 农历 {lunar.text}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Status & Progress Summary Card */}
          <div className={`p-3.5 rounded-2xl ${themeColors.subtleBg} border ${themeColors.subtleBorder} space-y-2`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 ${themeColors.primaryText}`} />
                <span className={`text-xs font-semibold ${themeColors.textMain}`}>
                  打卡达成率
                </span>
              </div>
              <span className={`text-xs font-mono font-bold ${themeColors.primaryText}`}>
                {completedCount} / {totalCount} 项完成 ({completionRate}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  completionRate === 100
                    ? 'bg-emerald-500'
                    : completionRate > 50
                    ? 'bg-sky-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${completionRate}%` }}
              />
            </div>

            {/* Timestamps Insight */}
            {dayRecords.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>首项打卡: <strong className="text-slate-700">{earliestTime || '--:--'}</strong></span>
                {latestTime && latestTime !== earliestTime && (
                  <span>最后打卡: <strong className="text-slate-700">{latestTime}</strong></span>
                )}
                <span>共记录 {dayRecords.length} 次</span>
              </div>
            )}

            {/* Past / Future Guidance Notice */}
            {isPast && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white/60 p-2 rounded-xl border border-slate-200/60">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>此为历史记录，时间点真实凝固留痕，不可二次篡改或补卡。</span>
              </div>
            )}
            {isFuture && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200/70">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>未来日期尚未到来，打卡系统不支持提前预支打卡。</span>
              </div>
            )}
          </div>

          {/* Habit Details List */}
          <div>
            <h4 className={`text-xs font-semibold ${themeColors.textMain} mb-2 flex items-center justify-between`}>
              <span>习惯项目打卡时间明细</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {isToday ? '点击可更新时间' : '按时间点存档'}
              </span>
            </h4>

            {enabledTypes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">暂无启用的习惯项</p>
            ) : (
              <div className="space-y-2">
                {enabledTypes.map((type) => {
                  const record = recordsMap.get(type.id);
                  const isChecked = !!record;
                  const timeStr =
                    record?.checkInTime ||
                    (record?.createdAt ? record.createdAt.slice(11, 16) : '');
                  const previousList = record?.previousCheckIns || [];

                  return (
                    <div
                      key={type.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        isChecked
                          ? 'bg-emerald-50/80 border-emerald-300'
                          : isPast
                          ? 'bg-slate-50/60 border-slate-200 opacity-75'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Habit Symbol & Name */}
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 ${
                              isChecked
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span>{type.symbol}</span>
                          </div>
                          <div>
                            <span className={`text-xs font-semibold ${isChecked ? 'text-emerald-950' : 'text-slate-700'}`}>
                              {type.name}
                            </span>
                            {type.reminder?.enabled && type.reminder?.reminderTime && (
                              <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                                (计划 {type.reminder.reminderTime})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status & Time */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isChecked ? (
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                                <Clock className="w-3 h-3 text-emerald-700" />
                                <span>{timeStr}</span>
                              </span>
                            </div>
                          ) : (
                            <div>
                              {isToday ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleCheckIn(todayStr, type, 'overwrite');
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-sky-500 text-white rounded-lg shadow-2xs hover:bg-sky-600 active:scale-95 transition-all"
                                >
                                  今日打卡
                                </button>
                              ) : (
                                <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {isPast ? '未打卡' : '未开始'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Updates History if overwritten */}
                      {isChecked && previousList.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center gap-1 text-[10px] text-emerald-800 font-mono">
                          <History className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>时间更迭记录:</span>
                          <span className="text-emerald-700">
                            {previousList.join(' → ')} → {timeStr}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-3.5 border-t ${themeColors.cardBorder} flex items-center justify-between gap-2 shrink-0 bg-slate-50/50`}>
          {!isToday ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onSelectDate) onSelectDate(todayStr);
              }}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl ${themeColors.primaryText} ${themeColors.subtleBg} border ${themeColors.subtleBorder} hover:opacity-80 active:scale-95 transition-all`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>回到今天打卡</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              今日可正常更新打卡时间
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 active:scale-95 transition-all ml-auto"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
};
