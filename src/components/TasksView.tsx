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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Task, TaskCategory, TaskPriority, TaskStatus } from '../types';
import { getThemeColors } from '../utils/themeStyles';
import { DeleteConfirmationModal } from './records/DeleteConfirmationModal';

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
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  const categoriesList = useMemo<('全部' | TaskCategory)[]>(() => {
    return ['全部', ...taskCategories.filter((c) => c !== '习惯' && c !== '习惯打卡')];
  }, [taskCategories]);

  useEffect(() => {
    if (selectedCategory !== '全部' && !taskCategories.includes(selectedCategory)) {
      setSelectedCategory('全部');
    }
  }, [taskCategories, selectedCategory]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedCategory !== '全部' && t.category !== selectedCategory) return false;
      if (selectedStatus !== '全部' && t.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [tasks, selectedCategory, selectedStatus, searchQuery]);

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

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className={`${themeColors.cardBg} p-8 rounded-2xl border ${themeColors.cardBorder} text-center text-xs ${themeColors.textSub}`}>
            暂无此条件下的待办任务，点击上方「新建待办」添加
          </div>
        ) : (
          filteredTasks.map((task) => {
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
                    {statusBadge(task.status)}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                {/* Substeps progress bar */}
                {stepsTotal > 0 && (
                  <div className={`my-2 ${themeColors.subtleBg} p-2 rounded-xl border ${themeColors.subtleBorder}`}>
                    <div className={`flex items-center justify-between text-[10px] ${themeColors.textMuted} mb-1`}>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        子步骤进度
                      </span>
                      <span>
                        {stepsDone} / {stepsTotal}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${themeColors.primaryBg} rounded-full transition-all`}
                        style={{ width: `${(stepsDone / stepsTotal) * 100}%` }}
                      />
                    </div>
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
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 ${themeColors.subtleBg} ${themeColors.textMuted} rounded text-[10px] border ${themeColors.subtleBorder}`}>
                      {task.category}
                    </span>
                    {task.dueTime && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        {task.dueTime.slice(5, 16).replace('T', ' ')}
                      </span>
                    )}
                    {task.estimatedMinutes && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {task.estimatedMinutes}分
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
