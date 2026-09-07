// src/services/habitNotificationService.ts
import { CheckInType, CheckInRecord } from '../types';
import { AppStorage } from './storage';

export interface ActiveHabitBanner {
  habitId: string;
  habitName: string;
  symbol: string;
  timeText: string;
  reminderTime: string;
}

type NotificationListener = (activeBanners: ActiveHabitBanner[]) => void;

class HabitNotificationService {
  private activeNotifications = new Map<string, Notification>();
  private activeBanners: ActiveHabitBanner[] = [];
  private listeners: NotificationListener[] = [];
  private intervalId: any = null;

  constructor() {
    this.startEngine();
  }

  // Check if browser/mobile supports Notification API
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  // Get current permission status
  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  // Request system notification permission
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch (e) {
      console.warn('[HabitNotification] Request permission error:', e);
      return Notification.permission;
    }
  }

  // Subscribe to in-app banners
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

  // Dismiss in-app banner for a habit
  public dismissBanner(habitId: string) {
    this.activeBanners = this.activeBanners.filter((b) => b.habitId !== habitId);
    this.notifyListeners();
  }

  // Start periodic background checking engine
  public startEngine() {
    if (this.intervalId) return;
    // Check every 30 seconds
    this.checkReminders();
    this.intervalId = setInterval(() => {
      this.checkReminders();
    }, 30000);
  }

  public stopEngine() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Main reminder evaluation loop
  public checkReminders() {
    if (typeof window === 'undefined') return;

    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const currentHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = this.getLocalDateString(now);

    const habits: CheckInType[] = AppStorage.getCheckInTypes();
    const checkInRecords: CheckInRecord[] = AppStorage.getCheckInRecords();

    habits.forEach((habit) => {
      if (!habit.enabled || !habit.reminder || !habit.reminder.enabled) return;

      const reminder = habit.reminder;
      const daysOfWeek = reminder.daysOfWeek || [];

      // Check if today is an active day
      if (!daysOfWeek.includes(currentDay)) {
        // If an active notification exists from another day, close it
        this.closeNotification(habit.id);
        return;
      }

      // Check if user already checked in today for this habit
      const isAlreadyCheckedIn = checkInRecords.some(
        (r) => r.date === todayStr && r.typeId === habit.id
      );

      // 【核心防打扰铁律】：如果我完成了当前习惯打卡通知栏消失；如果我提前完成了打卡即使到提醒时间也不要提醒
      if (isAlreadyCheckedIn) {
        this.closeNotification(habit.id);
        this.dismissBanner(habit.id);
        return;
      }

      // Determine reminder trigger time (HH:mm)
      const triggerTime = reminder.reminderTime || reminder.targetStartTime || '21:00';

      // Check if trigger time has arrived today
      // e.g. currentHm >= triggerTime
      if (currentHm >= triggerTime) {
        const todayAlertKey = `habit_alert_${habit.id}_${todayStr}`;
        const alreadyAlerted = localStorage.getItem(todayAlertKey);

        if (!alreadyAlerted) {
          // Fire notification!
          localStorage.setItem(todayAlertKey, currentHm);
          this.dispatchNotification(habit, todayStr);
        }
      }
    });
  }

  // Send real system notification and in-app banner
  private dispatchNotification(habit: CheckInType, todayStr: string) {
    const reminder = habit.reminder;
    const timeText =
      reminder?.targetStartTime && reminder?.targetEndTime
        ? `${reminder.targetStartTime} ~ ${reminder.targetEndTime}`
        : reminder?.targetStartTime || reminder?.reminderTime || '';

    const title = `⏰ 习惯打卡提醒：${habit.symbol} ${habit.name}`;
    const body = `该进行「${habit.name}」打卡了！计划时段：${timeText}。打卡完成后通知将自动清除。`;

    // 1. Mobile & Web Notification API
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        // Close previous if any
        this.closeNotification(habit.id);

        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `habit-reminder-${habit.id}`,
          requireInteraction: true,
        });

        notif.onclick = () => {
          try {
            window.focus();
          } catch (_) {}
          notif.close();
          window.dispatchEvent(
            new CustomEvent('habit_reminder_click', {
              detail: { habitId: habit.id, date: todayStr },
            })
          );
        };

        this.activeNotifications.set(habit.id, notif);
      } catch (err) {
        console.warn('[HabitNotification] Web notification dispatch error:', err);
      }
    }

    // 2. In-App Floating Banner
    if (!this.activeBanners.some((b) => b.habitId === habit.id)) {
      this.activeBanners.push({
        habitId: habit.id,
        habitName: habit.name,
        symbol: habit.symbol,
        timeText,
        reminderTime: reminder?.reminderTime || '',
      });
      this.notifyListeners();
    }
  }

  // Close active system notification for a habit
  public closeNotification(habitId: string) {
    const active = this.activeNotifications.get(habitId);
    if (active) {
      try {
        active.close();
      } catch (_) {}
      this.activeNotifications.delete(habitId);
    }
  }

  // Called immediately when user completes a check-in for today
  // 【核心功能】：如果我完成了当前习惯打卡通知栏消失；如果我提前完成了打卡即使到提醒时间也不要提醒
  public onHabitCompletedToday(habitId: string) {
    const todayStr = this.getLocalDateString(new Date());
    // 1. Close system notification immediately
    this.closeNotification(habitId);

    // 2. Remove in-app banner
    this.dismissBanner(habitId);

    // 3. Mark alert key so even if reminder time hasn't arrived yet, it will never fire today
    const todayAlertKey = `habit_alert_${habitId}_${todayStr}`;
    localStorage.setItem(todayAlertKey, 'early_completed');
  }

  // Immediate test notification for the user to preview in notification bar
  public testNotification(habit: CheckInType): boolean {
    if (!this.isSupported()) {
      alert('您的浏览器或环境不支持系统通知栏 API');
      return false;
    }

    if (Notification.permission !== 'granted') {
      alert('请先点击「申请通知权限」并允许通知权限');
      return false;
    }

    try {
      const timeText =
        habit.reminder?.targetStartTime && habit.reminder?.targetEndTime
          ? `${habit.reminder.targetStartTime} ~ ${habit.reminder.targetEndTime}`
          : '21:00 ~ 22:00';

      const notif = new Notification(`⏰ [测试] 习惯打卡提醒：${habit.symbol} ${habit.name}`, {
        body: `计划时段：${timeText}。当您在 App 中点击打卡后，此通知栏提醒将自动消失！`,
        icon: '/favicon.ico',
        tag: `habit-reminder-test-${habit.id}`,
        requireInteraction: false,
      });

      this.activeNotifications.set(habit.id, notif);
      return true;
    } catch (e: any) {
      alert(`测试通知发送失败: ${e.message || String(e)}`);
      return false;
    }
  }

  private getLocalDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export const habitNotificationService = new HabitNotificationService();
