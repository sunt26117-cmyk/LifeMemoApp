// src/services/habitNotificationService.ts
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { CheckInType, CheckInRecord } from '../types';
import { AppStorage } from './storage';
import {
  ActiveHabitBanner,
  NotificationListener,
  getNumericId,
  getScheduleId,
  getLocalDateString,
  getHabitNotificationContent,
  buildHabitSchedules,
} from './habitNotificationHelper';

export type { ActiveHabitBanner };

class HabitNotificationService {
  private activeWebNotifications = new Map<string, Notification>();
  private activeBanners: ActiveHabitBanner[] = [];
  private listeners: NotificationListener[] = [];
  private intervalId: any = null;
  private channelInitialized = false;

  constructor() {
    this.initAndroidChannel();
    this.initActionListener();
    this.startEngine();
  }

  public getNumericId(id: string): number {
    return getNumericId(id);
  }

  public getScheduleId(habitId: string, dayOfWeek: number): number {
    return getScheduleId(habitId, dayOfWeek);
  }

  private async initAndroidChannel() {
    if (Capacitor.isNativePlatform() && !this.channelInitialized) {
      try {
        await LocalNotifications.createChannel({
          id: 'habit-reminders',
          name: '习惯打卡提醒',
          description: '生活记录应用习惯定时打卡提醒（支持系统底层闹钟定时唤醒）',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
        });
        this.channelInitialized = true;
      } catch (e) {
        console.warn('[HabitNotification] Android channel init error:', e);
      }
    }
  }

  private async initActionListener() {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          const habitId = action.notification.extra?.habitId;
          const date = action.notification.extra?.date || getLocalDateString(new Date());
          if (habitId) {
            window.dispatchEvent(
              new CustomEvent('habit_reminder_click', {
                detail: { habitId, date },
              })
            );
          }
        });
      } catch (e) {
        console.warn('[HabitNotification] Add listener error:', e);
      }
    }
  }

  public isSupported(): boolean {
    return Capacitor.isNativePlatform() || (typeof window !== 'undefined' && 'Notification' in window);
  }

  public async getPermissionAsync(): Promise<NotificationPermission> {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'granted') return 'granted';
        if (perm.display === 'denied') return 'denied';
        return 'default';
      } catch (e) {
        console.warn('[HabitNotification] checkPermissions error:', e);
        return 'default';
      }
    }
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
  }

  public getPermission(): NotificationPermission {
    if (Capacitor.isNativePlatform()) return 'default';
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (Capacitor.isNativePlatform()) {
      try {
        await this.initAndroidChannel();
        const res = await LocalNotifications.requestPermissions();
        if (res.display === 'granted') {
          await this.syncAllHabitSchedules();
          return 'granted';
        }
        return res.display === 'denied' ? 'denied' : 'default';
      } catch (e) {
        console.warn('[HabitNotification] Native requestPermissions error:', e);
        return 'denied';
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        return await Notification.requestPermission();
      } catch (e) {
        console.warn('[HabitNotification] Web requestPermission error:', e);
        return Notification.permission;
      }
    }
    return 'denied';
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    listener(this.activeBanners);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l([...this.activeBanners]));
  }

  public dismissBanner(habitId: string) {
    this.activeBanners = this.activeBanners.filter((b) => b.habitId !== habitId);
    this.notifyListeners();
  }

  public startEngine() {
    if (this.intervalId) return;
    this.checkReminders();
    this.intervalId = setInterval(() => this.checkReminders(), 30000);
  }

  public stopEngine() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 【核心架构升级】向手机操作系统底层（Android AlarmManager）预注册系统定时闹钟
   */
  public async syncAllHabitSchedules(
    customHabits?: CheckInType[],
    customRecords?: CheckInRecord[]
  ): Promise<void> {
    const habits = customHabits || AppStorage.getCheckInTypes();
    const checkInRecords = customRecords || AppStorage.getCheckInRecords();

    if (Capacitor.isNativePlatform()) {
      try {
        await this.initAndroidChannel();
        const perm = await this.getPermissionAsync();
        if (perm !== 'granted') return;

        // 清理原有待触发闹钟，防止编辑时间或删除习惯后残留
        try {
          const pending = await LocalNotifications.getPending();
          if (pending.notifications && pending.notifications.length > 0) {
            await LocalNotifications.cancel({
              notifications: pending.notifications.map((n) => ({ id: n.id })),
            });
          }
        } catch (_) {}

        const notificationsToSchedule = buildHabitSchedules(habits, checkInRecords);
        if (notificationsToSchedule.length > 0) {
          await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        }
      } catch (err) {
        console.warn('[HabitNotification] syncAllHabitSchedules error:', err);
      }
    }

    await this.checkReminders();
  }

  public async checkReminders() {
    if (typeof window === 'undefined') return;

    const now = new Date();
    const currentDay = now.getDay();
    const currentHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = getLocalDateString(now);

    const habits = AppStorage.getCheckInTypes();
    const checkInRecords = AppStorage.getCheckInRecords();

    for (const habit of habits) {
      if (!habit.enabled || !habit.reminder?.enabled) continue;
      const daysOfWeek = habit.reminder.daysOfWeek || [];
      if (!daysOfWeek.includes(currentDay)) {
        await this.closeNotification(habit.id);
        continue;
      }

      const isAlreadyCheckedIn = checkInRecords.some(
        (r) => r.date === todayStr && r.typeId === habit.id
      );

      if (isAlreadyCheckedIn) {
        await this.closeNotification(habit.id);
        this.dismissBanner(habit.id);
        continue;
      }

      const triggerTime = habit.reminder.reminderTime || habit.reminder.targetStartTime || '21:00';
      if (currentHm >= triggerTime) {
        const todayAlertKey = `habit_alert_${habit.id}_${todayStr}`;
        if (!localStorage.getItem(todayAlertKey)) {
          localStorage.setItem(todayAlertKey, currentHm);
          await this.dispatchForegroundNotification(habit, todayStr);
        }
      }
    }
  }

  public async dispatchForegroundNotification(habit: CheckInType, todayStr: string) {
    const { timeText, title, body } = getHabitNotificationContent(habit);

    if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        this.closeWebNotification(habit.id);
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `habit-reminder-${habit.id}`,
          requireInteraction: true,
        });
        notif.onclick = () => {
          try { window.focus(); } catch (_) {}
          notif.close();
          window.dispatchEvent(new CustomEvent('habit_reminder_click', { detail: { habitId: habit.id, date: todayStr } }));
        };
        this.activeWebNotifications.set(habit.id, notif);
      } catch (err) {
        console.warn('[HabitNotification] Web notification dispatch error:', err);
      }
    }

    if (!this.activeBanners.some((b) => b.habitId === habit.id)) {
      this.activeBanners.push({
        habitId: habit.id,
        habitName: habit.name,
        symbol: habit.symbol,
        timeText,
        reminderTime: habit.reminder?.reminderTime || '',
      });
      this.notifyListeners();
    }
  }

  public async closeNotification(habitId: string) {
    if (Capacitor.isNativePlatform()) {
      try {
        const todayScheduleId = getScheduleId(habitId, new Date().getDay());
        const baseId = getNumericId(habitId);
        await LocalNotifications.cancel({ notifications: [{ id: todayScheduleId }, { id: baseId }] });
        await LocalNotifications.removeDeliveredNotificationsById({ ids: [todayScheduleId, baseId] });
      } catch (e) {
        console.warn('[HabitNotification] Native cancel error:', e);
      }
    }
    this.closeWebNotification(habitId);
  }

  private closeWebNotification(habitId: string) {
    const active = this.activeWebNotifications.get(habitId);
    if (active) {
      try { active.close(); } catch (_) {}
      this.activeWebNotifications.delete(habitId);
    }
  }

  public async onHabitCompletedToday(habitId: string) {
    const todayStr = getLocalDateString(new Date());
    await this.closeNotification(habitId);
    this.dismissBanner(habitId);
    localStorage.setItem(`habit_alert_${habitId}_${todayStr}`, 'early_completed');

    if (Capacitor.isNativePlatform()) {
      await this.syncAllHabitSchedules();
    }
  }

  public async cancelHabitSchedules(habitId: string) {
    if (Capacitor.isNativePlatform()) {
      try {
        const idsToCancel = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ id: getScheduleId(habitId, day) }));
        idsToCancel.push({ id: getNumericId(habitId) });
        await LocalNotifications.cancel({ notifications: idsToCancel });
        await LocalNotifications.removeDeliveredNotificationsById({ ids: idsToCancel.map((n) => n.id) });
      } catch (e) {
        console.warn('[HabitNotification] cancelHabitSchedules error:', e);
      }
    }
    await this.closeNotification(habitId);
    this.dismissBanner(habitId);
  }

  public async testNotification(habit: CheckInType): Promise<boolean> {
    if (!this.isSupported()) return false;
    const { timeText } = getHabitNotificationContent(habit);
    const title = `⏰ [测试] 习惯打卡提醒：${habit.symbol} ${habit.name}`;
    const body = `计划时段：${timeText}。系统底层闹钟已联动，打卡完成后通知栏提醒将自动清除！`;

    if (Capacitor.isNativePlatform()) {
      try {
        await this.initAndroidChannel();
        const perm = await this.getPermissionAsync();
        if (perm !== 'granted' && (await this.requestPermission()) !== 'granted') return false;

        const testId = getNumericId(habit.id);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: testId,
              title,
              body,
              channelId: 'habit-reminders',
              schedule: { at: new Date(Date.now() + 200) },
              extra: { habitId: habit.id, date: getLocalDateString(new Date()) },
            },
          ],
        });
        return true;
      } catch (e) {
        console.warn('[HabitNotification] Native test error:', e);
        return false;
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') return false;
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `habit-reminder-test-${habit.id}`,
          requireInteraction: false,
        });
        this.activeWebNotifications.set(habit.id, notif);
        return true;
      } catch (e) {
        console.warn('[HabitNotification] Web test error:', e);
        return false;
      }
    }
    return false;
  }
}

export const habitNotificationService = new HabitNotificationService();
