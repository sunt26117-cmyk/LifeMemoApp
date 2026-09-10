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
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLunarDisplay } from '../utils/lunarUtil';
import { Task, TaskStatus } from '../types';
import { getThemeColors } from '../utils/themeStyles';
import { formatLocalDate } from '../utils/dateUtil';
import { ManageHabitsModal } from './review/ManageHabitsModal';
import { CollapsibleCheckInList } from './checkin/CollapsibleCheckInList';

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

  const [isManageHabitsOpen, setIsManageHabitsOpen] = useState(false);

  const themeColors = getThemeColors(theme);

  const today = new Date();
  const todayStr = formatLocalDate(today);
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
      ? 'from-[#A85822] via-[#B86B35] to-[#D48950]'
      : theme === 'forest'
      ? 'from-[#27583B] via-[#35724F] to-[#4F9468]'
      : 'from-[#2B6CB0] via-[#3B82F6] to-[#48B8A6]';

  return (
    <div className="space-y-3.5 pb-20">
      {/* Date & Greeting Card - Clean 3-Tier Structured Layout (Compressed Height) */}
      <div className={`bg-gradient-to-br ${bannerGradient} rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 text-white shadow-sm relative overflow-hidden`}>
        <div className="relative z-10 space-y-2 sm:space-y-2.5">
          {/* Tier 1: Date & Lunar (Left) + Prominent Year Milestone (Right) */}
          <div className="flex items-center justify-between gap-2 pb-1.5 sm:pb-2 border-b border-white/15">
            {/* Left: Date + Lunar info */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <span className="text-base sm:text-lg font-bold tracking-tight shrink-0">
                {today.getMonth() + 1}月{today.getDate()}日 {weekDayStr}
              </span>
              <span className="text-[10px] sm:text-[11px] text-white/85 bg-white/15 px-2 py-0.5 rounded-full font-medium backdrop-blur-xs shrink-0">
                农历 {lunarInfo.text}
              </span>
            </div>

            {/* Right: Year Milestone with Enlarged Bold Font */}
            <div className="flex items-baseline gap-1 bg-white/15 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-xl sm:rounded-2xl border border-white/20 backdrop-blur-xs shrink-0 shadow-2xs">
              <span className="text-[11px] text-white/85 font-medium">今年已过</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-200 drop-shadow-xs leading-none">
                {daysPassed}
              </span>
              <span className="text-[11px] text-white/90 font-medium">天</span>
            </div>
          </div>

          {/* Tier 2: Motto & Year Progress Bar (Full display with no font clipping) */}
          <div className="pt-0.5">
            <div className="flex items-center justify-between gap-2 text-[11px] text-white/95 leading-normal mb-1">
              <span className="font-medium tracking-wide truncate">
                保持节奏 · 小事记录，日常笃行
              </span>
              <span className="font-mono text-white/85 text-[10px] sm:text-[11px] shrink-0">
                余 {remainingDays} 天 · {yearProgressPercent}%
              </span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-white/95 h-full rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${yearProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Tier 3: 3 Structured Color-Coded Metric Cards in a Clean 3-Column Grid */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-0.5">
            {/* 待办 Card */}
            <div className={`${themeColors.metricTasksBg} ${themeColors.metricTasksBorder} border rounded-xl py-1.5 px-2 text-center backdrop-blur-2xs shadow-2xs transition-all`}>
              <span className={`text-[10.5px] sm:text-[11px] ${themeColors.metricTasksText} font-medium block leading-tight`}>今日待办</span>
              <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                <span className="text-base sm:text-lg font-bold font-mono leading-none text-white">
                  {completedTodayTasks.length}
                </span>
                <span className="text-[10px] sm:text-[11px] text-white/70 font-mono leading-none">
                  /{todayTasks.length + completedTodayTasks.length}
                </span>
              </div>
            </div>

            {/* 打卡 Card */}
            <div className={`${themeColors.metricHabitsBg} ${themeColors.metricHabitsBorder} border rounded-xl py-1.5 px-2 text-center backdrop-blur-2xs shadow-2xs transition-all`}>
              <span className={`text-[10.5px] sm:text-[11px] ${themeColors.metricHabitsText} font-medium block leading-tight`}>习惯打卡</span>
              <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                <span className="text-base sm:text-lg font-bold font-mono leading-none text-white">
                  {todayCheckIns.length}
                </span>
                <span className="text-[10px] sm:text-[11px] text-white/70 leading-none">项</span>
              </div>
            </div>

            {/* 反思 Card */}
            <div className={`${themeColors.metricReflectionsBg} ${themeColors.metricReflectionsBorder} border rounded-xl py-1.5 px-2 text-center backdrop-blur-2xs shadow-2xs transition-all`}>
              <span className={`text-[10.5px] sm:text-[11px] ${themeColors.metricReflectionsText} font-medium block leading-tight`}>深度反思</span>
              <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
                <span className="text-base sm:text-lg font-bold font-mono leading-none text-white">
                  {reflections.length}
                </span>
                <span className="text-[10px] sm:text-[11px] text-white/70 leading-none">篇</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Check-In List with Top Calendar Strip & Multi-Option Capsule System */}
      <CollapsibleCheckInList onOpenManageHabits={() => setIsManageHabitsOpen(true)} />

      {/* 4 Quick Entry Action Cards */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onOpenMemoryCreate}
          className={`flex flex-col items-center justify-center p-2.5 sm:p-3 ${themeColors.cardBg} hover:opacity-90 active:scale-95 rounded-2xl border ${themeColors.cardBorder} shadow-xs transition-all text-center group cursor-pointer`}
        >
          <div className={`w-9 h-9 rounded-xl ${themeColors.subtleBg} ${themeColors.primaryText} flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform`}>
            <BookOpen className="w-4 h-4" />
          </div>
          <span className={`text-xs font-medium ${themeColors.textMain}`}>写记录</span>
        </button>

        <button
          onClick={onOpenNoteCreate}
          className={`flex flex-col items-center justify-center p-2.5 sm:p-3 ${themeColors.cardBg} hover:opacity-90 active:scale-95 rounded-2xl border ${themeColors.cardBorder} shadow-xs transition-all text-center group cursor-pointer`}
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <StickyNote className="w-4 h-4" />
          </div>
          <span className={`text-xs font-medium ${themeColors.textMain}`}>随手记</span>
        </button>

        <button
          onClick={() => onOpenTaskCreate()}
          className={`flex flex-col items-center justify-center p-2.5 sm:p-3 ${themeColors.cardBg} hover:opacity-90 active:scale-95 rounded-2xl border ${themeColors.cardBorder} shadow-xs transition-all text-center group cursor-pointer`}
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span className={`text-xs font-medium ${themeColors.textMain}`}>建待办</span>
        </button>

        <button
          onClick={onOpenReflectionCreate}
          className={`flex flex-col items-center justify-center p-2.5 sm:p-3 ${themeColors.cardBg} hover:opacity-90 active:scale-95 rounded-2xl border ${themeColors.cardBorder} shadow-xs transition-all text-center group cursor-pointer`}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs font-medium ${themeColors.textMain} truncate`}>{task.title}</p>
                      {task.priority === '高' && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 text-rose-700 border border-rose-200/80 rounded font-semibold shrink-0">
                          高优
                        </span>
                      )}
                      {task.steps?.some((s) => !s.done && s.isDelayed) && (
                        <span className="text-[9px] px-1 py-0.2 bg-rose-100 text-rose-700 rounded font-medium flex items-center gap-0.5 shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          步骤延期
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 mt-1 text-[11px] ${themeColors.textMuted}`}>
                      <span className={`px-1.5 py-0.2 ${themeColors.cardBg} border ${themeColors.subtleBorder} rounded text-[10px]`}>
                        {task.category}
                      </span>
                      {(task.estimatedDurationValue || task.estimatedMinutes) && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {task.estimatedDurationValue != null && task.estimatedDurationUnit
                            ? `${task.estimatedDurationValue}${task.estimatedDurationUnit}`
                            : `${task.estimatedMinutes}分`}
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

      {isManageHabitsOpen && (
        <ManageHabitsModal
          isOpen={isManageHabitsOpen}
          onClose={() => setIsManageHabitsOpen(false)}
        />
      )}
    </div>
  );
};
