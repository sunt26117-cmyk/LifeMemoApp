// src/services/habitNotificationHelper.ts
import { LocalNotificationSchema } from '@capacitor/local-notifications';
import { CheckInType, CheckInRecord } from '../types';

export interface ActiveHabitBanner {
  habitId: string;
  habitName: string;
  symbol: string;
  timeText: string;
  reminderTime: string;
}

export type NotificationListener = (activeBanners: ActiveHabitBanner[]) => void;

export function getNumericId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff;
  }
  return hash === 0 ? 1001 : hash;
}

export function getScheduleId(habitId: string, dayOfWeek: number): number {
  const base = getNumericId(habitId);
  return ((base % 10000000) * 10 + (dayOfWeek % 10)) & 0x7fffffff;
}

export function getLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getHabitNotificationContent(habit: CheckInType) {
  const reminder = habit.reminder;
  const timeText =
    reminder?.targetStartTime && reminder?.targetEndTime
      ? `${reminder.targetStartTime} ~ ${reminder.targetEndTime}`
      : reminder?.targetStartTime || reminder?.reminderTime || '21:00';

  const triggerTime = reminder?.reminderTime || reminder?.targetStartTime || '21:00';
  const [hourStr, minStr] = triggerTime.split(':');
  const hour = parseInt(hourStr || '21', 10);
  const minute = parseInt(minStr || '0', 10);

  const title = `⏰ 习惯打卡提醒：${habit.symbol} ${habit.name}`;
  const body = `该进行「${habit.name}」打卡了！计划时段：${timeText}。打卡完成后通知将自动清除。`;

  return { timeText, triggerTime, hour, minute, title, body };
}

export function buildHabitSchedules(
  habits: CheckInType[],
  checkInRecords: CheckInRecord[],
  now: Date = new Date()
): LocalNotificationSchema[] {
  const todayStr = getLocalDateString(now);
  const todayDay = now.getDay();
  const currentHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const notificationsToSchedule: LocalNotificationSchema[] = [];

  for (const habit of habits) {
    if (!habit.enabled || !habit.reminder?.enabled) continue;

    const daysOfWeek = habit.reminder.daysOfWeek || [];
    if (daysOfWeek.length === 0) continue;

    const { hour, minute, title, body, triggerTime } = getHabitNotificationContent(habit);
    const isAlreadyDoneToday = checkInRecords.some((r) => r.date === todayStr && r.typeId === habit.id);

    for (const day of daysOfWeek) {
      const scheduleId = getScheduleId(habit.id, day);
      const capacitorWeekday = day === 0 ? 1 : day + 1;

      if ((day === todayDay && isAlreadyDoneToday) || (day === todayDay && currentHm >= triggerTime)) {
        // 今日已完成或已过设定时间：推迟至下周排期
        const nextWeekDate = new Date(now);
        nextWeekDate.setDate(nextWeekDate.getDate() + 7);
        nextWeekDate.setHours(hour, minute, 0, 0);

        notificationsToSchedule.push({
          id: scheduleId,
          title,
          body,
          channelId: 'habit-reminders',
          schedule: { at: nextWeekDate, allowWhileIdle: true },
          extra: { habitId: habit.id, dayOfWeek: day, date: todayStr },
        });
      } else {
        // 注册系统底层周期性闹钟（支持熄屏与杀后台运行）
        notificationsToSchedule.push({
          id: scheduleId,
          title,
          body,
          channelId: 'habit-reminders',
          schedule: {
            on: { weekday: capacitorWeekday, hour, minute },
            allowWhileIdle: true,
          },
          extra: { habitId: habit.id, dayOfWeek: day, date: todayStr },
        });
      }
    }
  }

  return notificationsToSchedule;
}
