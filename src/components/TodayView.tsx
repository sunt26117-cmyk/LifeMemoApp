// src/components/TodayView.tsx
import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  ArrowRight,
  BookOpen,
  StickyNote,
  CheckSquare,
  Flame,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLunarDisplay } from '../utils/lunarUtil';
import { Task, TaskStatus } from '../types';
import { getThemeColors } from '../utils/themeStyles';

interface TodayViewProps {
  onOpenTaskCreate: (title?: string) => void;
  onOpenTaskEdit: (task: Task) => void;
  onOpenTaskStatus: (task: Task, targetStatus: TaskStatus) => void;
  onOpenMemoryCreate: () => void;
  onOpenNoteCreate: () => void;
  onOpenReflectionCreate: () => void;
  onUnlockBiometric: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  onOpenTaskCreate,
  onOpenTaskEdit,
  onOpenTaskStatus,
  onOpenMemoryCreate,
  onOpenNoteCreate,
  onOpenReflectionCreate,
  onUnlockBiometric,
}) => {
  const {
    tasks,
    checkInTypes,
    checkInRecords,
    toggleCheckIn,
    memories,
    photos,
    reflections,
    isBiometricLocked,
    setActiveTab,
    theme,
  } = useApp();

  const themeColors = getThemeColors(theme);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const lunarInfo = getLunarDisplay(today);

  const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekDayStr = WEEK_DAYS[today.getDay()];

  // Calculate year elapsed metrics (days passed this year with large typography)
  const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDaysInYear = isLeapYear(today.getFullYear()) ? 366 : 365;
  const startOfYearUtc = new Date(Date.UTC(today.getFullYear(), 0, 1));
  const currentUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const daysPassed = Math.round((currentUtc.getTime() - startOfYearUtc.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const remainingDays = Math.max(0, totalDaysInYear - daysPassed);
  const yearProgressPercent = ((daysPassed / totalDaysInYear) * 100).toFixed(1);

  // Today's tasks (active or due today or unstarted)
  const todayTasks = tasks.filter((t) => {
    if (t.status === '进行中') return true;
    if (t.status === '未开始') return true;
    if (t.dueTime && t.dueTime.startsWith(todayStr)) return true;
    return false;
  });

  const completedTodayTasks = tasks.filter(
    (t) => t.status === '已完成' && t.feedback?.completedTime?.startsWith(todayStr)
  );

  const todayCheckIns = checkInRecords.filter((r) => r.date === todayStr);

  // Gradient for the top hero banner depending on theme
  const bannerGradient =
    theme === 'warm'
      ? 'from-[#C4753D] via-[#D8894E] to-[#E5AC77]'
      : theme === 'forest'
      ? 'from-[#35724F] via-[#488B63] to-[#67AC83]'
      : 'from-sky-500 via-[#57B8E3] to-[#7ED9B7]';

  return (
    <div className="space-y-4 pb-20">
      {/* Date & Greeting Card */}
      <div className={`bg-gradient-to-r ${bannerGradient} rounded-3xl p-5 text-white shadow-sm relative overflow-hidden`}>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              {weekDayStr} · 农历 {lunarInfo.text}
            </span>
            <div className="flex items-center gap-1 text-xs bg-amber-400/30 px-2 py-0.5 rounded-full">
              <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
              <span>今日打卡 {todayCheckIns.length} 项</span>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 mt-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">
                {today.getMonth() + 1}月{today.getDate()}日，保持节奏
              </h2>
              <p className="text-xs text-white/90 mt-1 max-w-[210px] sm:max-w-xs leading-relaxed">
                小事记录，日常笃行。将行动沉淀为不可逆的行为成长证据。
              </p>
            </div>

            {/* 年度时光流逝展示：用较大的数字字体显示今年已经过去了多少天 */}
            <div className="shrink-0 bg-white/15 backdrop-blur-xs border border-white/25 rounded-2xl px-3.5 py-2 text-center shadow-xs flex flex-col items-center justify-center min-w-[86px]">
              <span className="text-[10px] text-white/80 font-medium tracking-wide">今年已过</span>
              <div className="flex items-baseline justify-center gap-0.5 my-0.5">
                <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono leading-none drop-shadow-xs">
                  {daysPassed}
                </span>
                <span className="text-xs text-white/90 font-medium">天</span>
              </div>
              <div className="text-[10px] text-white/75 flex items-center justify-center gap-1">
                <span>{yearProgressPercent}%</span>
                <span>·</span>
                <span>余{remainingDays}天</span>
              </div>
            </div>
          </div>

          {/* 年度时光流逝进度条 */}
          <div className="mt-3 pt-2.5 border-t border-white/15">
            <div className="flex items-center justify-between text-[10px] text-white/80 mb-1">
              <span>{today.getFullYear()} 年度进程</span>
              <span>第 {daysPassed} / {totalDaysInYear} 天 ({yearProgressPercent}%)</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-white/90 h-full rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${yearProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-white/15 text-center">
            <div>
              <span className="text-[11px] text-white/80 block">待办进度</span>
              <span className="text-base font-bold">
                {completedTodayTasks.length}/{todayTasks.length + completedTodayTasks.length}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-white/80 block">习惯打卡</span>
              <span className="text-base font-bold">{todayCheckIns.length} 项</span>
            </div>
            <div>
              <span className="text-[11px] text-white/80 block">深度反思</span>
              <span className="text-base font-bold">{reflections.length} 篇</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Habits Check-in Bar */}
      <div className={`${themeColors.cardBg} rounded-2xl p-4 border ${themeColors.cardBorder} shadow-xs transition-colors`}>
        <div className="flex items-center justify-between mb-2.5">
          <span className={`text-xs font-semibold ${themeColors.textMain} flex items-center gap-1`}>
            <span>今日习惯打卡</span>
            <span className={`text-[10px] ${themeColors.textSub} font-normal`}>（点击直接完成）</span>
          </span>
          <button
            onClick={() => setActiveTab('review')}
            className={`text-[11px] ${themeColors.primaryText} hover:underline flex items-center font-medium`}
          >
            <span>日历全景</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {checkInTypes
            .filter((t) => t.enabled)
            .map((type) => {
              const isChecked = todayCheckIns.some((r) => r.typeId === type.id);
              return (
                <button
                  key={type.id}
                  onClick={() => toggleCheckIn(todayStr, type)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all border ${
                    isChecked
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800 shadow-xs scale-98'
                      : `${themeColors.subtleBg} ${themeColors.subtleBorder} ${themeColors.textMain} ${themeColors.subtleHoverBg}`
                  }`}
                >
                  <span className="text-sm">{type.symbol}</span>
                  <span>{type.name}</span>
                  {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />}
                </button>
              );
            })}
        </div>
      </div>

      {/* 4 Quick Entry Action Cards */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onOpenMemoryCreate}
          className={`flex flex-col items-center justify-center p-3 ${themeColors.cardBg} hover:opacity-90 rounded-2xl border ${themeColors.cardBorder} shadow-xs transition-all text-center group`}
        >
          <div className={`w-9 h-9 rounded-xl ${themeColors.subtleBg} ${themeColors.primaryText} flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform`}>
            <BookOpen className="w-4 h-4" />
          </div>
          <span className={`text-xs font-medium ${themeColors.textMain}`}>写记录</span>
        </button>

        <button
          onClick={onOpenNoteCreate}
          className={`flex flex-col items-center justify-center p-3 ${themeColors.cardBg} hover:opacity-90 rounded-2xl border ${themeColors.cardBorder} shadow-xs transition-all text-center group`}
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <StickyNote className="w-4 h-4" />
          </div>
          <span className={`text-xs font-medium ${themeColors.textMain}`}>随手记</span>
        </button>

        <button
          onClick={() => onOpenTaskCreate()}
          className={`flex flex-col items-center justify-center p-3 ${themeColors.cardBg} hover:opacity-90 rounded-2xl border ${themeColors.cardBorder} shadow-xs transition-all text-center group`}
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span className={`text-xs font-medium ${themeColors.textMain}`}>建待办</span>
        </button>

        <button
          onClick={onOpenReflectionCreate}
          className={`flex flex-col items-center justify-center p-3 ${themeColors.cardBg} hover:opacity-90 rounded-2xl border ${themeColors.cardBorder} shadow-xs transition-all text-center group`}
        >
          <div className="w-9 h-9 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className={`text-xs font-medium ${themeColors.textMain}`}>做复盘</span>
        </button>
      </div>

      {/* Today's Tasks */}
      <div className={`${themeColors.cardBg} rounded-2xl p-4 border ${themeColors.cardBorder} shadow-xs transition-colors`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className={`text-xs font-semibold ${themeColors.textMain}`}>今日执行待办</h3>
            <span className={`text-[11px] px-2 py-0.5 ${themeColors.subtleBg} ${themeColors.textMuted} rounded-full font-medium`}>
              {todayTasks.length} 项进行中
            </span>
          </div>
          <button
            onClick={() => onOpenTaskCreate()}
            className={`flex items-center gap-1 text-[11px] ${themeColors.primaryText} hover:underline font-medium`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建待办</span>
          </button>
        </div>

        {todayTasks.length === 0 ? (
          <div className={`text-center py-6 ${themeColors.textSub} text-xs`}>
            <p>🎉 今日暂无待处理任务，保持好节奏！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between p-3 rounded-xl ${themeColors.subtleBg} border ${themeColors.subtleBorder} hover:border-slate-300 transition-colors`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={() => onOpenTaskStatus(task, '已完成')}
                    className={`mt-0.5 ${themeColors.textSub} hover:text-emerald-600 transition-colors shrink-0`}
                  >
                    <Circle className="w-4 h-4" />
                  </button>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onOpenTaskEdit(task)}
                  >
                    <p className={`text-xs font-medium ${themeColors.textMain} truncate`}>{task.title}</p>
                    <div className={`flex items-center gap-2 mt-1 text-[11px] ${themeColors.textMuted}`}>
                      <span className={`px-1.5 py-0.2 ${themeColors.cardBg} border ${themeColors.subtleBorder} rounded text-[10px]`}>
                        {task.category}
                      </span>
                      {task.estimatedMinutes && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {task.estimatedMinutes}分
                        </span>
                      )}
                      {task.steps.length > 0 && (
                        <span>
                          {task.steps.filter((s) => s.done).length}/{task.steps.length} 步
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onOpenTaskStatus(task, '延期')}
                    className="text-[10px] px-2 py-1 text-amber-700 bg-amber-100/70 hover:bg-amber-200/70 rounded-lg font-medium"
                  >
                    延期
                  </button>
                  <button
                    onClick={() => onOpenTaskStatus(task, '已完成')}
                    className="text-[10px] px-2 py-1 text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/70 rounded-lg font-medium"
                  >
                    完成
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Reflection with Privacy Protection */}
      <div className={`${themeColors.cardBg} rounded-2xl p-4 border ${themeColors.cardBorder} shadow-xs transition-colors`}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className={`text-xs font-semibold ${themeColors.textMain}`}>最新行为反思沉淀</h3>
          </div>
          <button
            onClick={() => setActiveTab('review')}
            className="text-[11px] text-purple-600 hover:underline flex items-center font-medium"
          >
            <span>全部反思</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        {isBiometricLocked ? (
          <div className="p-4 bg-purple-100/40 rounded-xl border border-purple-200/70 text-center">
            <Lock className="w-6 h-6 text-purple-500 mx-auto mb-1.5" />
            <p className="text-xs text-slate-700 font-medium">反思已锁定</p>
            <p className="text-[11px] text-slate-500 mt-0.5">保护个人真实认知与情绪记录</p>
            <button
              onClick={onUnlockBiometric}
              className="mt-3 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg shadow-xs"
            >
              验证 PIN 码解锁
            </button>
          </div>
        ) : reflections.length === 0 ? (
          <p className={`text-xs ${themeColors.textSub} py-3 text-center`}>
            暂无反思记录，点击上方「做复盘」开始记录！
          </p>
        ) : (
          <div className="p-3 bg-purple-100/30 rounded-xl border border-purple-200/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                心境：{reflections[0].emotion}
              </span>
              <span className={`text-[10px] ${themeColors.textSub}`}>
                {reflections[0].createdAt.slice(0, 10)}
              </span>
            </div>
            <p className={`text-xs ${themeColors.textMain} font-medium line-clamp-2`}>
              {reflections[0].eventDescription}
            </p>
            {reflections[0].aiSummary && (
              <div className="mt-2 pt-2 border-t border-purple-200/50 text-[11px] text-slate-600 space-y-1">
                <p>
                  <span className="font-semibold text-emerald-600">做得好：</span>
                  {reflections[0].aiSummary.goodPoints}
                </p>
                <p>
                  <span className="font-semibold text-sky-600">下一步建议：</span>
                  {reflections[0].aiSummary.nextSuggestion}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Memories & Photos Stream */}
      <div className={`${themeColors.cardBg} rounded-2xl p-4 border ${themeColors.cardBorder} shadow-xs transition-colors`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-xs font-semibold ${themeColors.textMain}`}>最新生活记忆与画面</h3>
          <button
            onClick={() => setActiveTab('records')}
            className={`text-[11px] ${themeColors.primaryText} hover:underline flex items-center font-medium`}
          >
            <span>记录流</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {photos.slice(0, 2).map((p) => (
            <div
              key={p.id}
              className="relative aspect-video rounded-xl overflow-hidden group shadow-2xs"
            >
              <img src={p.localPath} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
                <p className="text-[10px] truncate">{p.aiSummary}</p>
                {p.locationName && (
                  <span className="text-[9px] text-white/80">{p.locationName}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {memories.slice(0, 2).map((m) => (
          <div
            key={m.id}
            className={`mt-2 p-2.5 ${themeColors.subtleBg} rounded-xl border ${themeColors.subtleBorder} text-xs`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`font-semibold ${themeColors.textMain} truncate`}>{m.title}</span>
              <span className={`text-[10px] ${themeColors.textSub}`}>{m.createdAt.slice(0, 10)}</span>
            </div>
            <p className={`${themeColors.textMuted} line-clamp-2`}>{m.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
