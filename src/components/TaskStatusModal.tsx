// src/components/TaskStatusModal.tsx
import React, { useState } from 'react';
import { X, CheckCircle2, Clock, AlertTriangle, Calendar, RefreshCw } from 'lucide-react';
import { CancelType, DelayType, Task, TaskStatus, TimeUnit } from '../types';
import { ConfirmTaskStatusPayload } from '../hooks/useAppModals';
import { durationToMinutes, formatFriendlyDateTime } from '../utils/taskTimeUtil';
import { useApp } from '../context/AppContext';
import { getThemeColors } from '../utils/themeStyles';

interface TaskStatusModalProps {
  isOpen: boolean;
  task: Task | null;
  targetStatus: TaskStatus | null;
  onClose: () => void;
  onConfirm: (params: ConfirmTaskStatusPayload) => void;
}

const COMMON_IMPROVEMENTS = [
  '提前规划时间',
  '减少外界干扰',
  '梳理关键清单',
  '模块化推进',
  '设定番茄时段',
  '及时求助对齐',
];

const TIME_UNITS: TimeUnit[] = ['天', '周', '月'];

export const TaskStatusModal: React.FC<TaskStatusModalProps> = ({
  isOpen,
  task,
  targetStatus,
  onClose,
  onConfirm,
}) => {
  const { theme } = useApp();
  const themeColors = getThemeColors(theme);

  // Initialize duration from task if available (min 0.5)
  const [durationUnit, setDurationUnit] = useState<TimeUnit>(
    task?.estimatedDurationUnit && ['天', '周', '月'].includes(task.estimatedDurationUnit)
      ? task.estimatedDurationUnit
      : '天'
  );
  const [durationValue, setDurationValue] = useState<number>(() => {
    if (task?.estimatedDurationValue != null && task.estimatedDurationValue >= 0.5) {
      return Math.round(task.estimatedDurationValue * 2) / 2;
    }
    return 1;
  });

  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([
    '提前规划时间',
    '减少外界干扰',
  ]);
  const [customImprovement, setCustomImprovement] = useState('');
  const [delayType, setDelayType] = useState<DelayType>('内部');
  const [cancelType, setCancelType] = useState<CancelType>('主动');
  const [reason, setReason] = useState('');

  // Rescheduling for delay
  const [rescheduleType, setRescheduleType] = useState<'none' | '+1d' | '+3d' | '+1w' | 'custom'>('none');
  const [customNewStart, setCustomNewStart] = useState<string>(
    task?.startTime ? task.startTime.slice(0, 16) : ''
  );
  const [customNewDue, setCustomNewDue] = useState<string>(
    task?.dueTime ? task.dueTime.slice(0, 16) : ''
  );

  if (!isOpen || !task || !targetStatus) return null;

  const toggleImprovement = (tag: string) => {
    if (selectedImprovements.includes(tag)) {
      setSelectedImprovements(selectedImprovements.filter((t) => t !== tag));
    } else {
      setSelectedImprovements([...selectedImprovements, tag]);
    }
  };

  const addCustomImprovement = () => {
    if (customImprovement.trim() && !selectedImprovements.includes(customImprovement.trim())) {
      setSelectedImprovements([...selectedImprovements, customImprovement.trim()]);
      setCustomImprovement('');
    }
  };

  const handleSave = () => {
    if (targetStatus === '已完成') {
      const calculatedMins = durationToMinutes(durationValue, durationUnit);
      onConfirm({
        durationMinutes: calculatedMins,
        durationValue,
        durationUnit,
        behaviorImprovement: selectedImprovements,
      });
    } else if (targetStatus === '延期') {
      let newStartStr: string | null = null;
      let newDueStr: string | null = null;

      if (rescheduleType !== 'none') {
        if (rescheduleType === 'custom') {
          newStartStr = customNewStart ? new Date(customNewStart).toISOString() : null;
          newDueStr = customNewDue ? new Date(customNewDue).toISOString() : null;
        } else {
          let daysToAdd = 1;
          if (rescheduleType === '+3d') daysToAdd = 3;
          if (rescheduleType === '+1w') daysToAdd = 7;

          const baseStart = task.startTime ? new Date(task.startTime) : new Date();
          const shiftedStart = new Date(baseStart.getTime() + daysToAdd * 24 * 3600 * 1000);
          newStartStr = shiftedStart.toISOString();

          if (task.dueTime) {
            const baseDue = new Date(task.dueTime);
            const shiftedDue = new Date(baseDue.getTime() + daysToAdd * 24 * 3600 * 1000);
            newDueStr = shiftedDue.toISOString();
          }
        }
      }

      onConfirm({
        delayType,
        reason: reason.trim() || '工作或生活日程调整',
        newStartTime: newStartStr,
        newDueTime: newDueStr,
      });
    } else if (targetStatus === '取消') {
      onConfirm({
        cancelType,
        reason: reason.trim() || '任务优先级调整',
      });
    } else {
      onConfirm({});
    }
    onClose();
  };

  // Preset quick values based on current unit (min 0.5)
  const getQuickValues = () => {
    switch (durationUnit) {
      case '天':
        return [0.5, 1, 2, 3, 5];
      case '周':
        return [0.5, 1, 2, 4];
      case '月':
        return [0.5, 1, 2, 3];
      default:
        return [0.5, 1, 2];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className={`bg-white rounded-2xl w-full max-w-md shadow-xl p-6 relative max-h-[90vh] overflow-y-auto border ${themeColors.cardBorder}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            {targetStatus === '已完成' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            {targetStatus === '延期' && <Clock className="w-5 h-5 text-amber-500" />}
            {targetStatus === '取消' && <AlertTriangle className="w-5 h-5 text-rose-500" />}
            <h3 className="text-base font-semibold text-slate-800">
              {targetStatus === '已完成' && '完成任务复盘'}
              {targetStatus === '延期' && '记录延期原因与排期'}
              {targetStatus === '取消' && '记录取消原因'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium line-clamp-1">{task.title}</p>
        </div>

        {/* Complete Fields */}
        {targetStatus === '已完成' && (
          <div className="space-y-4">
            {/* Recurring Task Hint */}
            {task.repeatRule && task.repeatRule !== '无' && (
              <div className={`p-3 ${themeColors.subtleBg} border ${themeColors.subtleBorder} rounded-xl text-xs ${themeColors.primaryText} flex items-start gap-2`}>
                <RefreshCw className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">周期循环任务：</span>
                  当前为【
                  {task.repeatRule === '自定义' && task.customRepeatDetail
                    ? `每${task.customRepeatDetail.interval}${task.customRepeatDetail.unit}`
                    : task.repeatRule}
                  】重复，完成本次后系统将自动生成下一周期的执行任务。
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600">实际投入用时</label>
                <span className="text-[11px] text-slate-400">
                  折合约 {durationToMinutes(durationValue, durationUnit)} 分钟
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={durationValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setDurationValue(!isNaN(val) && val >= 0.5 ? Math.round(val * 2) / 2 : 0.5);
                  }}
                  className={`w-24 text-center text-xs py-1.5 px-2 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing} font-mono font-medium`}
                />
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as TimeUnit)}
                  className={`text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
                >
                  {TIME_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center flex-wrap gap-1.5">
                {getQuickValues().map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDurationValue(val)}
                    className={`py-1 px-2.5 text-xs rounded-lg border transition-colors ${
                      durationValue === val
                        ? `${themeColors.subtleBg} border ${themeColors.subtleBorder} ${themeColors.primaryText} font-semibold`
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {val}
                    {durationUnit}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                行为改善沉淀（计入成长趋势证据）
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_IMPROVEMENTS.map((tag) => {
                  const isSelected = selectedImprovements.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleImprovement(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-700 font-medium'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="添加自定义行为改善..."
                  value={customImprovement}
                  onChange={(e) => setCustomImprovement(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomImprovement())}
                  className={`flex-1 text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none ${themeColors.focusRing}`}
                />
                <button
                  type="button"
                  onClick={addCustomImprovement}
                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delay Fields */}
        {targetStatus === '延期' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                延期类型（影响行为趋势计分）
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['外部', '内部', '逃避'] as DelayType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDelayType(t)}
                    className={`py-2 text-xs rounded-xl border text-center transition-all ${
                      delayType === t
                        ? 'bg-amber-50 border-amber-400 text-amber-700 font-semibold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>{t}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {t === '外部' && '+0.5 分'}
                      {t === '内部' && '+1.0 分'}
                      {t === '逃避' && '+2.0 警告'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reschedule Options */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                顺延任务排期（自动更新子任务时间轴）
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'none', label: '暂不顺延' },
                  { id: '+1d', label: '顺延 1 天' },
                  { id: '+3d', label: '顺延 3 天' },
                  { id: '+1w', label: '顺延 1 周' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRescheduleType(item.id as any)}
                    className={`py-1.5 text-xs rounded-lg border text-center transition-all ${
                      rescheduleType === item.id
                        ? `${themeColors.subtleBg} border ${themeColors.subtleBorder} ${themeColors.primaryText} font-semibold`
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {rescheduleType !== 'none' && (
                <div className="text-[11px] text-slate-500 pt-1">
                  当前开始时间：{formatFriendlyDateTime(task.startTime) || '未设置'}
                  {task.dueTime && ` | 截止时间：${formatFriendlyDateTime(task.dueTime)}`}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                延期具体原因说明
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如：紧急临时会议插单，需延后至明天上午..."
                className={`w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
              />
            </div>
          </div>
        )}

        {/* Cancel Fields */}
        {targetStatus === '取消' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                取消类型（终态不可撤销）
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['主动', '被动', '逃避'] as CancelType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCancelType(t)}
                    className={`py-2 text-xs rounded-xl border text-center transition-all ${
                      cancelType === t
                        ? 'bg-rose-50 border-rose-400 text-rose-700 font-semibold shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>{t}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {t === '主动' && '0 分'}
                      {t === '被动' && '+1.0 分'}
                      {t === '逃避' && '+2.0 警告'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                取消原因说明
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="说明取消该任务的考量..."
                className={`w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none ${themeColors.focusRing}`}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`px-4 py-2 ${themeColors.actionBtn} text-white text-xs font-medium rounded-xl transition-colors shadow-xs`}
          >
            确认更新
          </button>
        </div>
      </div>
    </div>
  );
};
