// src/components/TasksView.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Play,
  RotateCcw,
  AlertTriangle,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  Settings,
  ChevronDown,
  ChevronUp,
  Repeat,
  Search,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Task, TaskCategory, TaskPriority, TaskStatus } from '../types';
import { getThemeColors } from '../utils/themeStyles';
import { DeleteConfirmationModal } from './records/DeleteConfirmationModal';
import { computeStepsTimeline, formatFriendlyDateTime, getStepTimeStatus } from '../utils/taskTimeUtil';
import { ListPaginationControl } from './ListPaginationControl';

interface TasksViewProps {
  onOpenTaskCreate: (category?: TaskCategory) => void;
  onOpenTaskEdit: (task: Task) => void;
  onOpenTaskStatus: (task: Task, targetStatus: TaskStatus) => void;
}

const STATUS_FILTERS: ('全部' | TaskStatus)[] = [
  '全部',
  '进行中',
  '未开始',
  '延期',
  '已完成',
  '取消',
];

export const TasksView: React.FC<TasksViewProps> = ({
  onOpenTaskCreate,
  onOpenTaskEdit,
  onOpenTaskStatus,
}) => {
  const {
    tasks,
    updateTask,
    deleteTask,
    offloadItem,
    permanentDeleteItem,
    changeTaskStatus,
    taskCategories,
    setSettingsOpen,
    theme,
  } = useApp();
  const themeColors = getThemeColors(theme);

  const [selectedCategory, setSelectedCategory] = useState<'全部' | TaskCategory>('全部');
  const [selectedStatus, setSelectedStatus] = useState<'全部' | TaskStatus>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'startTime' | 'dueTime' | 'priority'>('default');
  const [onlyDelayed, setOnlyDelayed] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  // Pagination state: >10 items auto-hide with Show More / Collapse
  const [tasksVisibleCount, setTasksVisibleCount] = useState(10);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setTasksVisibleCount(10);
  }, [selectedCategory, selectedStatus, searchQuery, sortBy, onlyDelayed]);

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleToggleTaskStepInline = (task: Task, stepIdx: number) => {
    if (!task.steps || !task.steps[stepIdx]) return;
    const newSteps = [...task.steps];
    newSteps[stepIdx] = { ...newSteps[stepIdx], done: !newSteps[stepIdx].done };
    const computed = computeStepsTimeline(task.startTime, newSteps);
    updateTask({ ...task, steps: computed });
  };

  const categoriesList = useMemo<('全部' | TaskCategory)[]>(() => {
    return ['全部', ...taskCategories.filter((c) => c !== '习惯' && c !== '习惯打卡')];
  }, [taskCategories]);

  useEffect(() => {
    if (selectedCategory !== '全部' && !taskCategories.includes(selectedCategory)) {
      setSelectedCategory('全部');
    }
  }, [taskCategories, selectedCategory]);

  // Total count of delayed steps across all active tasks
  const totalDelayedStepsCount = useMemo(() => {
    return tasks.reduce((acc, t) => acc + (t.steps?.filter((s) => !s.done && s.isDelayed).length || 0), 0);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const list = tasks.filter((t) => {
      if (selectedCategory !== '全部' && t.category !== selectedCategory) return false;
      if (selectedStatus !== '全部' && t.status !== selectedStatus) return false;
      if (onlyDelayed) {
        const hasDelayedStep = t.steps?.some((s) => !s.done && s.isDelayed);
        if (!hasDelayedStep && t.status !== '延期') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });

    if (sortBy === 'startTime') {
      return [...list].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
    }

    if (sortBy === 'dueTime') {
      return [...list].sort((a, b) => {
        if (!a.dueTime) return 1;
        if (!b.dueTime) return -1;
        return new Date(a.dueTime).getTime() - new Date(b.dueTime).getTime();
      });
    }

    if (sortBy === 'priority') {
      const pWeights: Record<TaskPriority, number> = { 高: 3, 中: 2, 低: 1 };
      return [...list].sort((a, b) => (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0));
    }

    return list;
  }, [tasks, selectedCategory, selectedStatus, searchQuery, onlyDelayed, sortBy]);

  const priorityColor = (p: TaskPriority) => {
    if (p === '高') return 'bg-rose-100 text-rose-700';
    if (p === '中') return 'bg-amber-100 text-amber-700';
    return `${themeColors.subtleBg} ${themeColors.textMuted}`;
  };

  const statusBadge = (status: TaskStatus) => {
    switch (status) {
      case '进行中':
        return <span className="text-[10px] px-2 py-0.5 bg-sky-100 text-sky-700 rounded-md font-medium">进行中</span>;
      case '未开始':
        return <span className={`text-[10px] px-2 py-0.5 ${themeColors.subtleBg} ${themeColors.textMuted} rounded-md font-medium border ${themeColors.subtleBorder}`}>未开始</span>;
      case '已完成':
        return <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-medium">已完成</span>;
      case '延期':
        return <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md font-medium">已延期</span>;
      case '取消':
        return <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md font-medium">已取消</span>;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-base font-semibold ${themeColors.textMain}`}>待办任务执行池</h2>
          <p className={`text-xs ${themeColors.textSub}`}>闭环推进 · 行为追踪 · 驱动趋势沉淀</p>
        </div>
        <button
          onClick={() => onOpenTaskCreate(selectedCategory === '全部' ? undefined : selectedCategory)}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${themeColors.actionBtn} text-white text-xs font-medium rounded-xl shadow-xs transition-colors`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建待办</span>
        </button>
      </div>

      {/* Category Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {categoriesList.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
              selectedCategory === cat
                ? `${themeColors.primaryBg} text-white shadow-xs`
                : `${themeColors.cardBg} border ${themeColors.cardBorder} ${themeColors.textMain} hover:border-slate-300`
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className={`px-2.5 py-1.5 rounded-xl ${themeColors.textSub} hover:${themeColors.textMain} border border-dashed ${themeColors.cardBorder} hover:border-slate-300 font-medium shrink-0 transition-all flex items-center gap-1`}
          title="管理生活任务分类"
        >
          <Settings className="w-3 h-3" />
          <span>分类管理</span>
        </button>
      </div>

      {/* Status Bar */}
      <div className={`flex gap-1 overflow-x-auto p-1 ${themeColors.segmentBg} rounded-xl text-xs no-scrollbar`}>
        {STATUS_FILTERS.map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition-all ${
              selectedStatus === st
                ? `${themeColors.segmentActiveBg} ${themeColors.segmentActiveText} font-semibold shadow-xs`
                : `${themeColors.textMuted} hover:${themeColors.textMain}`
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Search & Sort Toolbar */}
      <div className="flex items-center gap-2 text-xs">
        <div className={`flex-1 flex items-center gap-1.5 px-3 py-1.5 ${themeColors.cardBg} border ${themeColors.cardBorder} rounded-xl shadow-2xs`}>
          <Search className={`w-3.5 h-3.5 ${themeColors.textMuted} shrink-0`} />
          <input
            type="text"
            placeholder="搜索待办任务标题、描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`flex-1 bg-transparent text-xs ${themeColors.textMain} placeholder:${themeColors.textMuted} focus:outline-none`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`p-0.5 ${themeColors.textMuted} hover:${themeColors.textMain} rounded-full`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort selector */}
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`py-1.5 pl-2.5 pr-6 ${themeColors.cardBg} border ${themeColors.cardBorder} rounded-xl text-xs font-medium ${themeColors.textMain} focus:outline-none cursor-pointer appearance-none shadow-2xs`}
          >
            <option value="default">默认排序</option>
            <option value="startTime">按开始时间</option>
            <option value="dueTime">按截止时间</option>
            <option value="priority">按优先级</option>
          </select>
          <ArrowUpDown className={`w-3 h-3 ${themeColors.textMuted} absolute right-2 top-2 pointer-events-none`} />
        </div>
      </div>

      {/* Delayed Steps Quick Filter / Alert Banner */}
      {totalDelayedStepsCount > 0 && (
        <div
          onClick={() => setOnlyDelayed(!onlyDelayed)}
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
            onlyDelayed
              ? 'bg-rose-500 text-white shadow-xs'
              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100/70'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>检测到有 {totalDelayedStepsCount} 个任务子步骤已超时延期</span>
          </div>
          <span className={`text-[11px] underline underline-offset-2 ${onlyDelayed ? 'text-white' : 'text-rose-600'}`}>
            {onlyDelayed ? '显示全部任务' : '只看延期'}
          </span>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className={`${themeColors.cardBg} p-8 rounded-2xl border ${themeColors.cardBorder} text-center text-xs ${themeColors.textSub}`}>
            暂无此条件下的待办任务，点击上方「新建待办」添加
          </div>
        ) : (
          filteredTasks.slice(0, tasksVisibleCount).map((task) => {
            const stepsDone = task.steps.filter((s) => s.done).length;
            const stepsTotal = task.steps.length;

            return (
              <div
                key={task.id}
                className={`p-3.5 ${themeColors.cardBg} rounded-2xl border ${themeColors.cardBorder} shadow-xs ${themeColors.cardHoverBorder} transition-colors`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (task.status !== '已完成') {
                          onOpenTaskStatus(task, '已完成');
                        }
                      }}
                      className={`mt-0.5 ${themeColors.textSub} hover:text-emerald-600 transition-colors shrink-0`}
                    >
                      {task.status === '已完成' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onOpenTaskEdit(task)}
                    >
                      <h4
                        className={`text-xs font-semibold truncate ${
                          task.status === '已完成'
                            ? `line-through ${themeColors.textSub}`
                            : themeColors.textMain
                        }`}
                      >
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className={`text-[11px] ${themeColors.textMuted} line-clamp-1 mt-0.5`}>
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {task.steps?.some((s) => !s.done && s.isDelayed) && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-medium flex items-center gap-0.5 animate-pulse">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        步骤延期
                      </span>
                    )}
                    {statusBadge(task.status)}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                {/* Substeps progress & expandable list */}
                {stepsTotal > 0 && (
                  <div className={`my-2 ${themeColors.subtleBg} p-2.5 rounded-xl border ${themeColors.subtleBorder}`}>
                    <div
                      onClick={() => toggleTaskExpand(task.id)}
                      className="flex items-center justify-between text-[11px] cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Layers className="w-3.5 h-3.5 text-sky-600" />
                        子步骤进度 ({stepsDone}/{stepsTotal})
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span>{expandedTaskIds[task.id] ? '收起步骤' : '查看步骤详情'}</span>
                        {expandedTaskIds[task.id] ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden my-1.5">
                      <div
                        className={`h-full ${themeColors.primaryBg} rounded-full transition-all`}
                        style={{ width: `${(stepsDone / stepsTotal) * 100}%` }}
                      />
                    </div>

                    {/* 展开的子步骤清单与时间轴状态 */}
                    {expandedTaskIds[task.id] && (
                      <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-200/60">
                        {task.steps?.map((step, sIdx) => {
                          const status = getStepTimeStatus(step);
                          return (
                            <div
                              key={sIdx}
                              className={`flex items-center justify-between p-1.5 px-2 rounded-lg text-xs transition-colors ${
                                step.isDelayed
                                  ? 'bg-rose-50/70 border border-rose-200'
                                  : step.done
                                  ? 'bg-white/60 text-slate-400'
                                  : 'bg-white border border-slate-200/60'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleTaskStepInline(task, sIdx)}
                                className="flex items-center gap-1.5 text-left flex-1 min-w-0"
                              >
                                {step.done ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className={`truncate ${step.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                  <span className="text-[10px] text-slate-400 mr-1 font-mono">#{sIdx + 1}</span>
                                  {step.content}
                                </span>
                              </button>

                              <div className="flex items-center gap-1.5 shrink-0 text-[10px] ml-2">
                                <span className="text-slate-500 font-mono bg-slate-100 px-1 py-0.5 rounded">
                                  {step.durationValue ?? 1}
                                  {step.durationUnit || '天'}
                                </span>

                                {step.estimatedDueTime && (
                                  <span className="text-slate-400 font-mono hidden sm:inline">
                                    {formatFriendlyDateTime(step.estimatedDueTime).slice(5)}
                                  </span>
                                )}

                                {status.text && (
                                  <span className={`px-1 py-0.5 rounded font-medium ${status.colorClass}`}>
                                    {status.text}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback info when completed / delayed / cancelled */}
                {task.feedback?.completedTime && (
                  <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-100/60 p-2 rounded-xl">
                    <span>✓ 完成用时: {task.feedback.executionDurationMinutes} 分钟</span>
                    {task.feedback.behaviorImprovement && task.feedback.behaviorImprovement.length > 0 && (
                      <div className="mt-0.5 text-[10px] text-emerald-700">
                        行为改善: {task.feedback.behaviorImprovement.join('、')}
                      </div>
                    )}
                  </div>
                )}

                {task.feedback?.delayType && (
                  <div className="mt-2 text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-xl">
                    <span>⏳ 延期（{task.feedback.delayType}原因）: {task.feedback.reason}</span>
                  </div>
                )}

                {task.feedback?.cancelType && (
                  <div className="mt-2 text-[11px] text-rose-800 bg-rose-100/60 p-2 rounded-xl">
                    <span>✕ 取消（{task.feedback.cancelType}取消）: {task.feedback.reason}</span>
                  </div>
                )}

                {/* Footer details & Actions */}
                <div className={`flex items-center justify-between mt-2.5 pt-2 border-t ${themeColors.divider} text-[11px] ${themeColors.textSub}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 ${themeColors.subtleBg} ${themeColors.textMuted} rounded text-[10px] border ${themeColors.subtleBorder}`}>
                      {task.category}
                    </span>

                    {task.startTime && (
                      <span className="flex items-center gap-0.5 text-[10px] text-sky-700 bg-sky-50 px-1 py-0.5 rounded border border-sky-100">
                        <Clock className="w-2.5 h-2.5" />
                        始:{task.startTime.slice(5, 16).replace('T', ' ')}
                      </span>
                    )}

                    {task.dueTime && (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        <Calendar className="w-2.5 h-2.5" />
                        止:{task.dueTime.slice(5, 16).replace('T', ' ')}
                      </span>
                    )}

                    {(task.estimatedDurationValue || task.estimatedMinutes) && (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        <Clock className="w-2.5 h-2.5" />
                        {task.estimatedDurationValue != null && task.estimatedDurationUnit
                          ? `${task.estimatedDurationValue}${task.estimatedDurationUnit}`
                          : `${task.estimatedMinutes}分`}
                      </span>
                    )}

                    {task.repeatRule && task.repeatRule !== '无' && (
                      <span className="flex items-center gap-0.5 text-[10px] text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-100">
                        <Repeat className="w-2.5 h-2.5" />
                        {task.repeatRule === '自定义' && task.customRepeatDetail
                          ? `每${task.customRepeatDetail.interval}${task.customRepeatDetail.unit}`
                          : task.repeatRule}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {task.status === '未开始' && (
                      <button
                        onClick={() => changeTaskStatus({ taskId: task.id, newStatus: '进行中' })}
                        className={`flex items-center gap-1 px-2 py-1 ${themeColors.subtleBg} hover:${themeColors.cardBg} ${themeColors.primaryText} rounded-lg text-xs font-medium border ${themeColors.subtleBorder}`}
                      >
                        <Play className="w-3 h-3" />
                        <span>开始</span>
                      </button>
                    )}

                    {task.status === '进行中' && (
                      <>
                        <button
                          onClick={() => onOpenTaskStatus(task, '延期')}
                          className="px-2 py-1 text-amber-700 bg-amber-100/60 hover:bg-amber-200/60 rounded-lg text-xs font-medium"
                        >
                          延期
                        </button>
                        <button
                          onClick={() => onOpenTaskStatus(task, '已完成')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium"
                        >
                          完成
                        </button>
                      </>
                    )}

                    {task.status === '延期' && (
                      <button
                        onClick={() => changeTaskStatus({ taskId: task.id, newStatus: '进行中' })}
                        className={`px-2 py-1 ${themeColors.primaryText} ${themeColors.subtleBg} hover:${themeColors.cardBg} rounded-lg text-xs font-medium border ${themeColors.subtleBorder}`}
                      >
                        重启执行
                      </button>
                    )}

                    <button
                      onClick={() => onOpenTaskEdit(task)}
                      className={`p-1 ${themeColors.textSub} hover:${themeColors.textMain} rounded-md`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteTarget({
                          id: task.id,
                          title: '删除待办任务',
                          description: `【${task.category} · 优先级:${task.priority}】${task.title}`,
                        })
                      }
                      className={`p-1 ${themeColors.textSub} hover:text-rose-500 rounded-md`}
                      title="删除任务"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dual-Track Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.title || '删除待办任务'}
        itemDescription={deleteTarget?.description}
        onClose={() => setDeleteTarget(null)}
        onOffload={() => {
          if (deleteTarget) {
            offloadItem('tasks', deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onPermanentDelete={() => {
          if (deleteTarget) {
            permanentDeleteItem('tasks', deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
