// src/components/tasks/TaskCard.tsx
import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Edit2,
  Layers,
  Play,
  Repeat,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { ThemeColors } from '../../utils/themeStyles';
import { TaskStepsTimeline } from './TaskStepsTimeline';

interface TaskCardProps {
  task: Task;
  themeColors: ThemeColors;
  onOpenEdit: (task: Task) => void;
  onOpenStatusModal: (task: Task, targetStatus: TaskStatus) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteRequest: (task: Task) => void;
  onToggleStep: (task: Task, stepIdx: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  themeColors,
  onOpenEdit,
  onOpenStatusModal,
  onStatusChange,
  onDeleteRequest,
  onToggleStep,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const stepsDone = (task.steps || []).filter((s) => s.done).length;
  const stepsTotal = (task.steps || []).length;
  const hasDelayedStep = task.steps?.some((s) => !s.done && s.isDelayed);

  const priorityColor = (p: TaskPriority) => {
    switch (p) {
      case '高':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case '中':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case '低':
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  const statusBadge = (status: TaskStatus) => {
    switch (status) {
      case '进行中':
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold ${themeColors.inProgressPill}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            进行中
          </span>
        );
      case '未开始':
        return (
          <span className={`text-[10px] px-2 py-0.5 ${themeColors.subtleBg} ${themeColors.textSub} border ${themeColors.subtleBorder} rounded-md font-medium`}>
            未开始
          </span>
        );
      case '已完成':
        return (
          <span className={`text-[10px] px-2 py-0.5 ${themeColors.completionPill} rounded-md font-medium`}>
            已完成
          </span>
        );
      case '延期':
        return (
          <span className={`text-[10px] px-2 py-0.5 ${themeColors.alertWarningBg} ${themeColors.alertWarningText} border ${themeColors.alertWarningBorder} rounded-md font-medium`}>
            已延期
          </span>
        );
      case '取消':
        return (
          <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-medium">
            已取消
          </span>
        );
    }
  };

  // Border & accent treatment based on priority and state
  const borderHighlight =
    task.status === '进行中'
      ? themeColors.inProgressCardBorder
      : task.priority === '高' && task.status !== '已完成'
      ? 'border-rose-200 hover:border-rose-300'
      : `${themeColors.cardBorder} ${themeColors.cardHoverBorder}`;

  return (
    <div
      className={`p-3.5 sm:p-4 ${themeColors.cardBg} rounded-2xl border ${borderHighlight} transition-all duration-200`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (task.status !== '已完成') {
                onOpenStatusModal(task, '已完成');
              }
            }}
            className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-transform active:scale-95 shrink-0"
            title={task.status === '已完成' ? '已闭环完成' : '点击完成此待办'}
          >
            {task.status === '已完成' ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 fill-emerald-50" />
            ) : (
              <Circle className="w-4.5 h-4.5" />
            )}
          </button>

          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenEdit(task)}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${priorityColor(task.priority)}`}>
                {task.priority}优
              </span>
              <h4
                className={`text-xs sm:text-sm font-semibold truncate ${
                  task.status === '已完成' ? `line-through ${themeColors.textSub}` : themeColors.textMain
                }`}
              >
                {task.title}
              </h4>
            </div>

            {task.description && (
              <p className={`text-xs ${themeColors.textMuted} line-clamp-2 mt-1 leading-relaxed`}>
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-1 shrink-0">
          {hasDelayedStep && (
            <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-medium flex items-center gap-0.5 animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5" />
              步骤延期
            </span>
          )}
          {statusBadge(task.status)}
        </div>
      </div>

      {/* Substeps progress & collapsible interactive timeline */}
      {stepsTotal > 0 && (
        <div className={`my-2.5 ${themeColors.subtleBg} p-2.5 sm:p-3 rounded-xl border ${themeColors.subtleBorder}`}>
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between text-xs cursor-pointer hover:opacity-85 transition-opacity"
          >
            <div className="flex items-center gap-1.5 font-medium">
              <Layers className={`w-3.5 h-3.5 ${themeColors.primaryText}`} />
              <span className={themeColors.textMain}>子步骤推进进度</span>
              <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${themeColors.cardBg} ${themeColors.textSub}`}>
                {stepsDone}/{stepsTotal}
              </span>
            </div>

            <div className={`flex items-center gap-1 text-[11px] ${themeColors.textSub}`}>
              <span>{isExpanded ? '收起步骤' : '展开详情'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Micro Progress Track */}
          <div className={`w-full h-1.5 ${themeColors.progressTrackBg} rounded-full overflow-hidden my-2`}>
            <div
              className={`h-full ${themeColors.primaryBg} rounded-full transition-all duration-300`}
              style={{ width: `${(stepsDone / stepsTotal) * 100}%` }}
            />
          </div>

          {/* Expanded Step Timeline */}
          {isExpanded && (
            <TaskStepsTimeline
              task={task}
              steps={task.steps || []}
              themeColors={themeColors}
              onToggleStep={(sIdx) => onToggleStep(task, sIdx)}
            />
          )}
        </div>
      )}

      {/* Feedback Summary when completed / delayed / cancelled */}
      {task.feedback?.completedTime && (
        <div className="mt-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl space-y-0.5">
          <div className="font-medium flex items-center gap-1">
            <span>✓ 已闭环完成</span>
            {task.feedback.executionDurationMinutes != null && (
              <span className="text-[11px] text-emerald-700">（耗时 {task.feedback.executionDurationMinutes} 分钟）</span>
            )}
          </div>
          {task.feedback.behaviorImprovement && task.feedback.behaviorImprovement.length > 0 && (
            <div className="text-[11px] text-emerald-700">
              行为改善点：{task.feedback.behaviorImprovement.join('、')}
            </div>
          )}
        </div>
      )}

      {task.feedback?.delayType && (
        <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 p-2.5 rounded-xl">
          <span className="font-medium">⏳ 延期记录（{task.feedback.delayType}）：</span>
          <span>{task.feedback.reason}</span>
        </div>
      )}

      {task.feedback?.cancelType && (
        <div className="mt-2 text-xs text-rose-800 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
          <span className="font-medium">✕ 取消原因（{task.feedback.cancelType}）：</span>
          <span>{task.feedback.reason}</span>
        </div>
      )}

      {/* Footer Info & Action Buttons */}
      <div className={`flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t ${themeColors.divider} text-xs`}>
        {/* Left Meta Tags */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`px-2 py-0.5 ${themeColors.subtleBg} ${themeColors.textMuted} rounded-md border ${themeColors.subtleBorder} font-medium`}>
            {task.category}
          </span>

          {task.startTime && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
              <Clock className="w-3 h-3 text-sky-500" />
              始: {task.startTime.slice(5, 16).replace('T', ' ')}
            </span>
          )}

          {task.dueTime && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
              <Calendar className="w-3 h-3 text-slate-400" />
              止: {task.dueTime.slice(5, 16).replace('T', ' ')}
            </span>
          )}

          {(task.estimatedDurationValue || task.estimatedMinutes) && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 font-mono">
              <Clock className="w-3 h-3 text-slate-400" />
              {task.estimatedDurationValue != null && task.estimatedDurationUnit
                ? `${task.estimatedDurationValue}${task.estimatedDurationUnit}`
                : `${task.estimatedMinutes}分`}
            </span>
          )}

          {task.repeatRule && task.repeatRule !== '无' && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
              <Repeat className="w-3 h-3 text-purple-500" />
              {task.repeatRule === '自定义' && task.customRepeatDetail
                ? `每${task.customRepeatDetail.interval}${task.customRepeatDetail.unit}`
                : task.repeatRule}
            </span>
          )}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5">
          {task.status === '未开始' && (
            <button
              onClick={() => onStatusChange(task.id, '进行中')}
              className={`flex items-center gap-1 px-2.5 py-1 ${themeColors.primaryBg} text-white rounded-lg text-xs font-medium shadow-xs hover:opacity-90 transition-all`}
            >
              <Play className="w-3 h-3 fill-white text-white" />
              <span>启动</span>
            </button>
          )}

          {task.status === '进行中' && (
            <>
              <button
                onClick={() => onOpenStatusModal(task, '延期')}
                className="px-2.5 py-1 text-amber-700 bg-amber-100/70 hover:bg-amber-200/70 rounded-lg text-xs font-medium transition-colors"
              >
                延期
              </button>
              <button
                onClick={() => onOpenStatusModal(task, '已完成')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
              >
                完成
              </button>
            </>
          )}

          {task.status === '延期' && (
            <button
              onClick={() => onStatusChange(task.id, '进行中')}
              className="flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重启</span>
            </button>
          )}

          <button
            onClick={() => onOpenEdit(task)}
            className={`p-1.5 ${themeColors.textSub} hover:${themeColors.textMain} hover:bg-slate-100 rounded-lg transition-colors`}
            title="编辑任务"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDeleteRequest(task)}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            title="删除任务"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
