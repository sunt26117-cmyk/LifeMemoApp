// src/components/TasksView.tsx
import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Task, TaskCategory, TaskPriority, TaskStatus } from '../types';

interface TasksViewProps {
  onOpenTaskCreate: (category?: TaskCategory) => void;
  onOpenTaskEdit: (task: Task) => void;
  onOpenTaskStatus: (task: Task, targetStatus: TaskStatus) => void;
}

const CATEGORIES: ('全部' | TaskCategory)[] = [
  '全部',
  '沟通',
  '学习',
  '健康',
  '项目',
  '情绪',
  '习惯',
  '规划',
];

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
  const { tasks, deleteTask, changeTaskStatus } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<'全部' | TaskCategory>('全部');
  const [selectedStatus, setSelectedStatus] = useState<'全部' | TaskStatus>('全部');
  const [searchQuery, setSearchQuery] = useState('');

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
    return 'bg-slate-100 text-slate-600';
  };

  const statusBadge = (status: TaskStatus) => {
    switch (status) {
      case '进行中':
        return <span className="text-[10px] px-2 py-0.5 bg-sky-100 text-sky-700 rounded-md font-medium">进行中</span>;
      case '未开始':
        return <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">未开始</span>;
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
          <h2 className="text-base font-semibold text-slate-800">待办任务执行池</h2>
          <p className="text-xs text-slate-400">闭环推进 · 行为追踪 · 驱动趋势沉淀</p>
        </div>
        <button
          onClick={() => onOpenTaskCreate(selectedCategory === '全部' ? undefined : selectedCategory)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#57B8E3] hover:bg-[#46a5d0] text-white text-xs font-medium rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建待办</span>
        </button>
      </div>

      {/* Category Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
              selectedCategory === cat
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div className="flex gap-1 overflow-x-auto p-1 bg-slate-100 rounded-xl text-xs no-scrollbar">
        {STATUS_FILTERS.map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition-all ${
              selectedStatus === st
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
            暂无此条件下的待办任务，点击上方「新建待办」添加
          </div>
        ) : (
          filteredTasks.map((task) => {
            const stepsDone = task.steps.filter((s) => s.done).length;
            const stepsTotal = task.steps.length;

            return (
              <div
                key={task.id}
                className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-slate-200 transition-colors"
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
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
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
                            ? 'line-through text-slate-400'
                            : 'text-slate-800'
                        }`}
                      >
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
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
                  <div className="my-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        子步骤进度
                      </span>
                      <span>
                        {stepsDone} / {stepsTotal}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#57B8E3] rounded-full transition-all"
                        style={{ width: `${(stepsDone / stepsTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Feedback info when completed / delayed / cancelled */}
                {task.feedback?.completedTime && (
                  <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50/60 p-2 rounded-xl">
                    <span>✓ 完成用时: {task.feedback.executionDurationMinutes} 分钟</span>
                    {task.feedback.behaviorImprovement && task.feedback.behaviorImprovement.length > 0 && (
                      <div className="mt-0.5 text-[10px] text-emerald-600">
                        行为改善: {task.feedback.behaviorImprovement.join('、')}
                      </div>
                    )}
                  </div>
                )}

                {task.feedback?.delayType && (
                  <div className="mt-2 text-[11px] text-amber-700 bg-amber-50/60 p-2 rounded-xl">
                    <span>⏳ 延期（{task.feedback.delayType}原因）: {task.feedback.reason}</span>
                  </div>
                )}

                {task.feedback?.cancelType && (
                  <div className="mt-2 text-[11px] text-rose-700 bg-rose-50/60 p-2 rounded-xl">
                    <span>✕ 取消（{task.feedback.cancelType}取消）: {task.feedback.reason}</span>
                  </div>
                )}

                {/* Footer details & Actions */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
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
                        {task.estimatedMinutes}m
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {task.status === '未开始' && (
                      <button
                        onClick={() => changeTaskStatus({ taskId: task.id, newStatus: '进行中' })}
                        className="flex items-center gap-1 px-2 py-1 bg-sky-50 hover:bg-sky-100 text-[#57B8E3] rounded-lg text-xs font-medium"
                      >
                        <Play className="w-3 h-3" />
                        <span>开始</span>
                      </button>
                    )}

                    {task.status === '进行中' && (
                      <>
                        <button
                          onClick={() => onOpenTaskStatus(task, '延期')}
                          className="px-2 py-1 text-amber-600 hover:bg-amber-50 rounded-lg text-xs"
                        >
                          延期
                        </button>
                        <button
                          onClick={() => onOpenTaskStatus(task, '已完成')}
                          className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium"
                        >
                          完成
                        </button>
                      </>
                    )}

                    {task.status === '延期' && (
                      <button
                        onClick={() => changeTaskStatus({ taskId: task.id, newStatus: '进行中' })}
                        className="px-2 py-1 text-[#57B8E3] hover:bg-sky-50 rounded-lg text-xs font-medium"
                      >
                        重启执行
                      </button>
                    )}

                    <button
                      onClick={() => onOpenTaskEdit(task)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-md"
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
    </div>
  );
};
