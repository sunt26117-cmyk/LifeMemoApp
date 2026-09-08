// src/components/review/HabitReminderModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Bell, BellOff, Check, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { CheckInType, HabitReminderConfig } from '../../types';
import { habitNotificationService } from '../../services/habitNotificationService';
import { useApp } from '../../context/AppContext';
import { getThemeColors } from '../../utils/themeStyles';
import { useModalBackHandler } from '../../services/modalBackManager';

interface HabitReminderModalProps {
  isOpen: boolean;
  habit: CheckInType | null;
  onClose: () => void;
  onSave: (updated: CheckInType) => void;
}

const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

const ADVANCE_OPTIONS = [
  { value: 0, label: '准时提醒' },
  { value: 5, label: '提前 5 分钟' },
  { value: 10, label: '提前 10 分钟' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
];

export const HabitReminderModal: React.FC<HabitReminderModalProps> = ({
  isOpen,
  habit,
  onClose,
  onSave,
}) => {
  const { theme } = useApp();
  const themeColors = getThemeColors(theme);

  const [enabled, setEnabled] = useState(true);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('21:00');
  const [endTime, setEndTime] = useState('22:00');
  const [advanceMinutes, setAdvanceMinutes] = useState(10);
  const [permStatus, setPermStatus] = useState<NotificationPermission>('default');
  const [testResult, setTestResult] = useState<string | null>(null);

  // Bind Android native back button to close HabitReminderModal
  useModalBackHandler(isOpen, onClose, 'habit_reminder_modal');

  useEffect(() => {
    if (isOpen && habit) {
      const rem = habit.reminder;
      if (rem) {
        setEnabled(rem.enabled ?? true);
        setDaysOfWeek(rem.daysOfWeek && rem.daysOfWeek.length > 0 ? rem.daysOfWeek : [1, 2, 3, 4, 5, 6, 0]);
        setStartTime(rem.targetStartTime || '20:00');
        setEndTime(rem.targetEndTime || '22:00');
        setAdvanceMinutes(rem.advanceMinutes ?? 10);
      } else {
        // Defaults: 20:00 ~ 22:00, advance 10 mins
        setEnabled(true);
        setDaysOfWeek([1, 2, 3, 4, 5, 6, 0]); // 默认每天
        setStartTime('20:00');
        setEndTime('22:00');
        setAdvanceMinutes(10);
      }
      habitNotificationService.getPermissionAsync().then(setPermStatus);
      setTestResult(null);
    }
  }, [isOpen, habit]);

  if (!isOpen || !habit) return null;

  // Compute trigger time
  const calculateReminderTime = (startStr: string, adv: number): string => {
    try {
      const [hStr, mStr] = startStr.split(':');
      let h = parseInt(hStr, 10);
      let m = parseInt(mStr, 10);
      let totalM = h * 60 + m - adv;
      if (totalM < 0) totalM += 24 * 60;
      const remH = Math.floor(totalM / 60) % 24;
      const remM = totalM % 60;
      return `${String(remH).padStart(2, '0')}:${String(remM).padStart(2, '0')}`;
    } catch {
      return startStr;
    }
  };

  const calculatedReminderTime = calculateReminderTime(startTime, advanceMinutes);

  const toggleDay = (dayVal: number) => {
    if (daysOfWeek.includes(dayVal)) {
      if (daysOfWeek.length === 1) return; // Keep at least one
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayVal));
    } else {
      setDaysOfWeek([...daysOfWeek, dayVal].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)));
    }
  };

  const selectQuickDays = (type: 'all' | 'work' | 'weekend') => {
    if (type === 'all') setDaysOfWeek([1, 2, 3, 4, 5, 6, 0]);
    if (type === 'work') setDaysOfWeek([1, 2, 3, 4, 5]);
    if (type === 'weekend') setDaysOfWeek([6, 0]);
  };

  const handleRequestPermission = async () => {
    const res = await habitNotificationService.requestPermission();
    setPermStatus(res);
    if (res === 'granted') {
      setTestResult('🎉 已成功获得手机通知栏权限！');
    } else {
      setTestResult('⚠️ 未获得权限，若已在手机设置中禁用，请在系统设置中允许通知');
    }
  };

  const handleTestNotification = async () => {
    const tempConfig: HabitReminderConfig = {
      enabled: true,
      daysOfWeek,
      targetStartTime: startTime,
      targetEndTime: endTime,
      reminderTime: calculatedReminderTime,
      advanceMinutes,
    };
    const success = await habitNotificationService.testNotification({
      ...habit,
      reminder: tempConfig,
    });
    if (success) {
      setTestResult('✅ 测试通知已发送至系统通知栏，请下拉查看！');
    } else {
      setTestResult('⚠️ 未能发送通知，请先点击「申请通知权限」允许通知');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reminderConfig: HabitReminderConfig = {
      enabled,
      daysOfWeek,
      targetStartTime: startTime,
      targetEndTime: endTime,
      reminderTime: calculatedReminderTime,
      advanceMinutes,
    };

    onSave({
      ...habit,
      reminder: reminderConfig,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
          <span className="text-2xl">{habit.symbol}</span>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              设定「{habit.name}」固定时间与提醒
            </h3>
            <p className="text-[11px] text-slate-500">
              支持固定打卡时段、周周期、提前通知与智能防打扰
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Switch Enable Reminder */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${enabled ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'}`}>
                {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-800 block">定时打卡提醒</span>
                <span className="text-[10px] text-slate-500">
                  {enabled ? '开启后按指定周期和时间在手机通知栏提醒' : '已关闭该习惯的定时提醒'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                enabled
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {enabled ? '已开启' : '已关闭'}
            </button>
          </div>

          {enabled && (
            <>
              {/* 2. Fixed Plan Time Range */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>固定打卡计划时间段</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 font-medium">开始时间</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs font-mono font-medium p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 font-medium">结束时间（可选）</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full text-xs font-mono font-medium p-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  例如设定「20:00 ~ 22:00」，即每晚8点到10点为该习惯专注打卡时段。
                </p>
              </div>

              {/* 3. Repeat Days of Week */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">重复周期（每周多选）</span>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => selectQuickDays('all')}
                      className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-medium"
                    >
                      每天
                    </button>
                    <button
                      type="button"
                      onClick={() => selectQuickDays('work')}
                      className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-medium"
                    >
                      工作日
                    </button>
                    <button
                      type="button"
                      onClick={() => selectQuickDays('weekend')}
                      className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-medium"
                    >
                      周末
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAY_OPTIONS.map((item) => {
                    const isSelected = daysOfWeek.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => toggleDay(item.value)}
                        className={`py-2 text-center text-xs font-medium rounded-xl transition-all border ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Advance Reminder (如 9点前提醒我要学习) */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">提前提醒时机</span>
                  <span className="text-[11px] font-mono font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                    将于 {calculatedReminderTime} 提醒
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {ADVANCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAdvanceMinutes(opt.value)}
                      className={`p-2 text-center text-xs rounded-xl border font-medium transition-all ${
                        advanceMinutes === opt.value
                          ? 'bg-sky-50 border-sky-500 text-sky-800 font-semibold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Mobile Notification Permission & Testing */}
              <div className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <span>📱 手机通知栏权限与测试</span>
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      permStatus === 'granted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {permStatus === 'granted' ? '已获得权限' : '未授权通知栏'}
                  </span>
                </div>

                <div className="flex gap-2">
                  {permStatus !== 'granted' && (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="flex-1 py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-xl transition-colors shadow-2xs text-center"
                    >
                      申请手机通知栏权限
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="flex-1 py-1.5 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-colors shadow-2xs text-center"
                  >
                    立即测试通知栏提醒
                  </button>
                </div>

                {testResult && (
                  <p className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 font-medium">
                    {testResult}
                  </p>
                )}

                {/* Anti-disturbance Rule Guarantee */}
                <div className="text-[10px] text-slate-500 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>智能防打扰保障（已自动生效）：</span>
                  </div>
                  <p>1. 完成该习惯打卡后，通知栏中的提醒将自动消失清除；</p>
                  <p>2. 若在提醒时间前已提前完成打卡，到达设定时间后将自动静默，绝不重复提醒！</p>
                </div>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className={`px-5 py-2 ${themeColors.actionBtn} text-white text-xs font-semibold rounded-xl shadow-xs transition-colors`}
              style={{
                backgroundColor: theme === 'warm' ? '#B86B35' : theme === 'forest' ? '#3B7D57' : '#4A90D9',
              }}
            >
              保存提醒设置
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
