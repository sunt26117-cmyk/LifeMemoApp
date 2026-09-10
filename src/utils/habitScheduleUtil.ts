// src/utils/habitScheduleUtil.ts
import { CheckInType } from '../types';
import { formatLocalDate, formatLocalTime, parseLocalDate } from './dateUtil';

/**
 * 判断某个习惯项在指定日期（YYYY-MM-DD）是否属于其设定的打卡周期
 * 用户要求：根据设定的周期显示当天的打卡按钮，若当天不需要打卡就不要显示按钮，只有当天需要打卡的才显示在首页行
 */
export function isHabitScheduledForDate(type: CheckInType, dateStr: string): boolean {
  if (!type.enabled) return false;

  // 解析目标日期的星期几（0: 周日, 1: 周一, ..., 6: 周六）
  const dateObj = parseLocalDate(dateStr);
  const dayOfWeek = dateObj.getDay();

  const rem = type.reminder;
  if (rem && Array.isArray(rem.daysOfWeek) && rem.daysOfWeek.length > 0) {
    return rem.daysOfWeek.includes(dayOfWeek);
  }

  // 若未指定特殊星期周期，默认每天都需要打卡
  return true;
}

/**
 * 检查习惯打卡是否已超过当天设定的最晚截止时间
 * 用户要求：习惯的打卡时间，如果超过了我当天的设定的最晚时间，超过之后就禁止当天打卡这个习惯
 */
export function isHabitTimeExpired(
  type: CheckInType,
  dateStr: string,
  isChecked: boolean,
  now: Date = new Date()
): boolean {
  // 如果已经打卡过，保留打卡成果，不视为未打卡超时禁止
  if (isChecked) return false;

  const todayStr = formatLocalDate(now);
  // 只对今天生效（历史日期由历史不可改规则保护，未来日期由不可预支规则保护）
  if (dateStr !== todayStr) return false;

  const targetEndTime = type.reminder?.targetEndTime;
  if (!targetEndTime) return false;

  const currentTimeStr = formatLocalTime(now);
  // 字符串比较 "HH:mm"，例如 "22:15" > "22:00" 为 true
  return currentTimeStr > targetEndTime;
}
