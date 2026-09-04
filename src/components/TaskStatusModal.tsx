// src/components/TaskStatusModal.tsx
import React, { useState } from 'react';
import { X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { CancelType, DelayType, Task, TaskStatus } from '../types';

interface TaskStatusModalProps {
  isOpen: boolean;
  task: Task | null;
  targetStatus: TaskStatus | null;
  onClose: () => void;
  onConfirm: (params: {
    durationMinutes?: number;
    behaviorImprovement?: string[];
    delayType?: DelayType | null;
    cancelType?: CancelType | null;
    reason?: string | null;
  }) => void;
}

const COMMON_IMPROVEMENTS = [
  '提前规划时间',
  '减少外界干扰',
  '梳理关键清单',
  '模块化推进',
  '设定番茄时段',
  '及时求助对齐',
];

export const TaskStatusModal: React.FC<TaskStatusModalProps> = ({
  isOpen,
  task,
  targetStatus,
  onClose,
  onConfirm,
}) => {
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([
    '提前规划时间',
    '减少外界干扰',
  ]);
  const [customImprovement, setCustomImprovement] = useState('');
  const [delayType, setDelayType] = useState<DelayType>('内部');
  const [cancelType, setCancelType] = useState<CancelType>('主动');
  const [reason, setReason] = useState('');

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
      onConfirm({
        durationMinutes,
        behaviorImprovement: selectedImprovements,
      });
    } else if (targetStatus === '延期') {
      onConfirm({
        delayType,
        reason: reason.trim() || '工作或生活日程调整',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 relative max-h-[90vh] overflow-y-auto">
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
              {targetStatus === '延期' && '记录延期原因'}
              {targetStatus === '取消' && '记录取消原因'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium line-clamp-1">{task.title}</p>
        </div>

        {/* Complete Fields */}
        {targetStatus === '已完成' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                实际投入用时（分钟）
              </label>
              <div className="flex items-center gap-2">
                {[15, 30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-1 px-2.5 text-xs rounded-lg border transition-colors ${
                      durationMinutes === mins
                        ? 'bg-sky-50 border-[#57B8E3] text-[#57B8E3] font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                  className="w-16 text-center text-xs py-1 border border-slate-200 rounded-lg focus:outline-none focus:border-[#57B8E3]"
                />
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
                  className="flex-1 text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#57B8E3]"
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

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                延期具体原因说明
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如：紧急临时会议插单，需延后至明天上午..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
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
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#57B8E3]"
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
            className="px-4 py-2 bg-[#57B8E3] hover:bg-[#46a5d0] text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
          >
            确认更新
          </button>
        </div>
      </div>
    </div>
  );
};
