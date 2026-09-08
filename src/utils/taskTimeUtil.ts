// src/utils/taskTimeUtil.ts
import { TaskStep, TimeUnit } from '../types';

/**
 * 将指定数值与时间单位转换为毫秒数
 */
export function durationToMs(value: number, unit: TimeUnit = '天'): number {
  const v = Math.max(0, Number(value) || 0);
  switch (unit) {
    case '分钟':
      return v * 60 * 1000;
    case '小时':
      return v * 3600 * 1000;
    case '天':
      return v * 24 * 3600 * 1000;
    case '周':
      return v * 7 * 24 * 3600 * 1000;
    case '月':
      return v * 30 * 24 * 3600 * 1000;
    default:
      return v * 24 * 3600 * 1000;
  }
}

/**
 * 转换为标准分钟数（便于向下兼容存储与报表统计）
 */
export function durationToMinutes(value: number, unit: TimeUnit = '天'): number {
  return Math.round(durationToMs(value, unit) / 60000);
}

/**
 * 以开始时间为基准，依次推算各个子任务的截止时间和延期状态
 * 规则：
 * 1. 步骤 1 截止时刻 = 开始时间 + 步骤 1 时长
 * 2. 步骤 2 截止时刻 = 步骤 1 截止时刻 + 步骤 2 时长 ...
 * 3. 若当前时间超过该步骤的预计截止时刻且步骤未勾选完成，自动判定已延期
 */
export function computeStepsTimeline(
  startTimeStr: string | null | undefined,
  steps: TaskStep[],
  referenceNow: Date = new Date()
): TaskStep[] {
  if (!steps || steps.length === 0) return [];

  // 基准开始时间，若未填写则默认为当前时刻
  let baseDate: Date;
  if (startTimeStr) {
    const parsed = new Date(startTimeStr);
    baseDate = isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    baseDate = new Date();
  }

  let runningTime = baseDate.getTime();

  return steps.map((step) => {
    const val = step.durationValue != null && !isNaN(step.durationValue) ? Number(step.durationValue) : undefined;
    const unit = step.durationUnit || '天';

    if (val != null && val > 0) {
      const stepMs = durationToMs(val, unit);
      runningTime += stepMs;
      const stepDueDate = new Date(runningTime);
      const estimatedDueTime = stepDueDate.toISOString();
      // 当前时间超过了子任务的预估时间后，自动判这个子任务已延期
      const isDelayed = !step.done && referenceNow.getTime() > runningTime;

      return {
        ...step,
        durationValue: val,
        durationUnit: unit,
        estimatedDueTime,
        isDelayed,
      };
    }

    return {
      ...step,
      estimatedDueTime: null,
      isDelayed: false,
    };
  });
}

/**
 * 格式化时间为友好字符串，如 "2026-09-08 14:00"
 */
export function formatFriendlyDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 计算步骤超时或剩余时间描述
 */
export function getStepTimeStatus(step: TaskStep, referenceNow: Date = new Date()): {
  text: string;
  isDelayed: boolean;
  colorClass: string;
} {
  if (step.done) {
    return { text: '已完成', isDelayed: false, colorClass: 'text-emerald-600 bg-emerald-50' };
  }

  if (!step.estimatedDueTime) {
    if (step.durationValue && step.durationUnit) {
      return {
        text: `预估 ${step.durationValue}${step.durationUnit}`,
        isDelayed: false,
        colorClass: 'text-slate-600 bg-slate-100',
      };
    }
    return { text: '', isDelayed: false, colorClass: '' };
  }

  const dueDate = new Date(step.estimatedDueTime);
  const diffMs = referenceNow.getTime() - dueDate.getTime();

  if (diffMs > 0) {
    // 已延期
    const diffMinutes = Math.floor(diffMs / 60000);
    let delayDesc = '';
    if (diffMinutes < 60) {
      delayDesc = `${diffMinutes}分钟`;
    } else if (diffMinutes < 1440) {
      delayDesc = `${Math.floor(diffMinutes / 60)}小时`;
    } else {
      delayDesc = `${(diffMinutes / 1440).toFixed(1).replace(/\.0$/, '')}天`;
    }
    return {
      text: `已延期 ${delayDesc}`,
      isDelayed: true,
      colorClass: 'text-rose-700 bg-rose-50 border border-rose-200 font-medium',
    };
  }

  // 未到截止时间
  const remainMs = Math.abs(diffMs);
  const remainMinutes = Math.floor(remainMs / 60000);
  let remainDesc = '';
  if (remainMinutes < 60) {
    remainDesc = `剩 ${remainMinutes}分钟`;
  } else if (remainMinutes < 1440) {
    remainDesc = `剩 ${Math.floor(remainMinutes / 60)}小时`;
  } else {
    remainDesc = `剩 ${(remainMinutes / 1440).toFixed(1).replace(/\.0$/, '')}天`;
  }

  return {
    text: remainDesc,
    isDelayed: false,
    colorClass: 'text-blue-700 bg-blue-50 border border-blue-200',
  };
}

/**
 * 智能把总时间分配给各个步骤（按用户要求：子任务最小以 0.5 天为单位分配）
 */
export function distributeDuration(
  totalValue: number,
  totalUnit: TimeUnit,
  count: number
): Array<{ value: number; unit: TimeUnit }> {
  if (count <= 0) return [];

  // 统一换算为天数（最小 0.5 天，且对齐到 0.5 天倍数）
  let totalDays = 1;
  const numVal = Math.max(0.1, Number(totalValue) || 1);
  if (totalUnit === '天') {
    totalDays = Math.max(0.5, Math.round(numVal * 2) / 2);
  } else if (totalUnit === '周') {
    totalDays = Math.max(0.5, Math.round(numVal * 7 * 2) / 2);
  } else if (totalUnit === '月') {
    totalDays = Math.max(0.5, Math.round(numVal * 30 * 2) / 2);
  } else if (totalUnit === '小时') {
    totalDays = Math.max(0.5, Math.round((numVal / 24) * 2) / 2);
  } else {
    totalDays = Math.max(0.5, Math.round((numVal / 1440) * 2) / 2);
  }

  // 每一个半天(0.5天)作为一个离散分配块
  const totalHalfDays = Math.max(count, Math.round(totalDays * 2)); // 确保每步至少 0.5 天 (1 个半天)
  const baseHalf = Math.floor(totalHalfDays / count);
  const remainderHalf = totalHalfDays % count;

  const result: Array<{ value: number; unit: TimeUnit }> = [];
  for (let i = 0; i < count; i++) {
    const stepHalf = baseHalf + (i < remainderHalf ? 1 : 0);
    const stepDays = Math.max(0.5, Number((stepHalf * 0.5).toFixed(1)));
    result.push({ value: stepDays, unit: '天' });
  }

  return result;
}

/**
 * 根据重复规则与周期，计算下一个循环的开始时间与截止时间
 */
export function calculateNextRecurringDates(
  currentStartStr?: string | null,
  currentDueStr?: string | null,
  repeatRule: string = '无',
  customRepeatDetail?: { interval: number; unit: '天' | '周' | '月' } | null,
  referenceNow: Date = new Date()
): { nextStartTime: string; nextDueTime: string | null } {
  // 基准开始时间，如果未定义或无效，使用当前时间
  let baseStart: Date;
  if (currentStartStr) {
    const parsed = new Date(currentStartStr);
    baseStart = isNaN(parsed.getTime()) ? new Date(referenceNow) : parsed;
  } else {
    baseStart = new Date(referenceNow);
  }

  // 计算截止时间相较于开始时间的差值偏移，以便保持相同的任务跨度
  let spanMs: number | null = null;
  if (currentDueStr) {
    const parsedDue = new Date(currentDueStr);
    if (!isNaN(parsedDue.getTime())) {
      spanMs = Math.max(0, parsedDue.getTime() - baseStart.getTime());
    }
  }

  const nextStart = new Date(baseStart);

  switch (repeatRule) {
    case '每天':
      nextStart.setDate(nextStart.getDate() + 1);
      break;
    case '每周':
      nextStart.setDate(nextStart.getDate() + 7);
      break;
    case '每月':
      nextStart.setMonth(nextStart.getMonth() + 1);
      break;
    case '自定义': {
      const interval = Math.max(1, customRepeatDetail?.interval || 1);
      const unit = customRepeatDetail?.unit || '天';
      if (unit === '天') {
        nextStart.setDate(nextStart.getDate() + interval);
      } else if (unit === '周') {
        nextStart.setDate(nextStart.getDate() + interval * 7);
      } else if (unit === '月') {
        nextStart.setMonth(nextStart.getMonth() + interval);
      }
      break;
    }
    default:
      nextStart.setDate(nextStart.getDate() + 1);
  }

  // 如果推算出来的下次开始时间早于当前时刻（比如上周期严重逾期完成），顺延至当前时刻对应的同一时段
  if (nextStart.getTime() < referenceNow.getTime()) {
    nextStart.setTime(referenceNow.getTime());
  }

  const nextStartTime = nextStart.toISOString();
  let nextDueTime: string | null = null;
  if (spanMs !== null) {
    nextDueTime = new Date(nextStart.getTime() + spanMs).toISOString();
  }

  return { nextStartTime, nextDueTime };
}
