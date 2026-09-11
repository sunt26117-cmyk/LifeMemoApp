// src/components/tasks/TaskMetricsBar.tsx
import React from 'react';
import { AlertTriangle, CheckCircle2, Flame, Play, Target } from 'lucide-react';
import { Task } from '../../types';
import { ThemeColors } from '../../utils/themeStyles';

interface TaskMetricsBarProps {
  tasks: Task[];
  themeColors: ThemeColors;
  onlyDelayed: boolean;
  onToggleDelayedOnly: () => void;
}

export const TaskMetricsBar: React.FC<TaskMetricsBarProps> = ({
  tasks,
  themeColors,
  onlyDelayed,
  onToggleDelayedOnly,
}) => {
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.status === '进行中').length;
  const completedTasks = tasks.filter((t) => t.status === '已完成').length;
  const highPriorityTasks = tasks.filter((t) => t.priority === '高' && t.status !== '已完成' && t.status !== '取消').length;

  const totalDelayedSteps = tasks.reduce(
    (acc, t) => acc + (t.steps?.filter((s) => !s.done && s.isDelayed).length || 0),
    0
  );
  const delayedTasks = tasks.filter((t) => t.status === '延期').length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className={`p-3.5 sm:p-4 rounded-2xl ${themeColors.cardBg} border ${themeColors.cardBorder} shadow-xs space-y-3`}>
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className={`p-2 rounded-xl ${themeColors.totalPill} transition-all`}>
          <div className="flex items-center justify-center gap-1 text-[10.5px] font-medium opacity-85">
            <Target className="w-3 h-3 shrink-0" />
            <span>总待办</span>
          </div>
          <div className="text-lg font-bold mt-0.5 font-mono tracking-tight">{totalTasks}</div>
        </div>

        <div className={`p-2 rounded-xl ${themeColors.inProgressPill} transition-all`}>
          <div className="flex items-center justify-center gap-1 text-[10.5px] font-medium opacity-90">
            <Play className="w-3 h-3 fill-current shrink-0" />
            <span>推进中</span>
          </div>
          <div className="text-lg font-bold mt-0.5 font-mono tracking-tight">{inProgressTasks}</div>
        </div>

        <div className={`p-2 rounded-xl ${themeColors.highPriorityPill} transition-all`}>
          <div className="flex items-center justify-center gap-1 text-[10.5px] font-medium opacity-90">
            <Flame className="w-3 h-3 fill-current shrink-0" />
            <span>高优先</span>
          </div>
          <div className="text-lg font-bold mt-0.5 font-mono tracking-tight">{highPriorityTasks}</div>
        </div>

        <div className={`p-2 rounded-xl ${themeColors.completionPill} transition-all`}>
          <div className="flex items-center justify-center gap-1 text-[10.5px] font-medium opacity-90">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>完成率</span>
          </div>
          <div className="text-lg font-bold mt-0.5 font-mono tracking-tight">{completionRate}%</div>
        </div>
      </div>

      {/* Progress Bar & Subtitle */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className={`${themeColors.textSub} font-medium flex items-center gap-1`}>
            <span>已闭环 {completedTasks} / {totalTasks} 项</span>
          </span>
          <span className={`font-semibold ${themeColors.primaryText} font-mono tracking-tight`}>{completionRate}%</span>
        </div>
        <div className={`w-full h-2 ${themeColors.progressTrackBg} rounded-full overflow-hidden`}>
          <div
            className={`h-full ${themeColors.primaryBg} rounded-full transition-all duration-500`}
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Delayed Warning Filter Capsule if any */}
      {(totalDelayedSteps > 0 || delayedTasks > 0) && (
        <div
          onClick={onToggleDelayedOnly}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
            onlyDelayed
              ? `${themeColors.primaryBg} text-white shadow-xs`
              : `${themeColors.alertWarningBg} ${themeColors.alertWarningText} border ${themeColors.alertWarningBorder} hover:opacity-90`
          }`}
          title="点击切换只看延期任务"
        >
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              已检测到 {delayedTasks > 0 ? `${delayedTasks} 个延期任务` : ''}
              {delayedTasks > 0 && totalDelayedSteps > 0 ? '与 ' : ''}
              {totalDelayedSteps > 0 ? `${totalDelayedSteps} 个子步骤超时` : ''}
            </span>
          </div>
          <span className={`text-[11px] font-semibold shrink-0 ml-2 ${onlyDelayed ? 'text-white underline' : 'underline'}`}>
            {onlyDelayed ? '显示全部' : '聚焦延期'}
          </span>
        </div>
      )}
    </div>
  );
};
