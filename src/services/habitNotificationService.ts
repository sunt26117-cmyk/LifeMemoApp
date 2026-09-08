// src/services/habitNotificationService.ts
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
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

  // Generate 32-bit positive integer for Capacitor LocalNotifications
  public getNumericId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff;
    }
    return hash === 0 ? 1001 : hash;
  }

  // Initialize Android Notification Channel for high priority heads-up notifications
  private async initAndroidChannel() {
    if (Capacitor.isNativePlatform() && !this.channelInitialized) {
      try {
        await LocalNotifications.createChannel({
          id: 'habit-reminders',
          name: '习惯打卡提醒',
          description: '生活记录应用习惯定时打卡提醒与通知',
          importance: 5, // NotificationManager.IMPORTANCE_HIGH
          visibility: 1, // NotificationCompat.VISIBILITY_PUBLIC
          vibration: true,
          lights: true,
        });
        this.channelInitialized = true;
      } catch (e) {
        console.warn('[HabitNotification] Android channel init error:', e);
      }
    }
  }

  // Handle user tapping the notification in notification bar
  private async initActionListener() {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          const habitId = action.notification.extra?.habitId;
          const date = action.notification.extra?.date;
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

  // Check if system notification API is supported (native Android/iOS or web browser)
  public isSupported(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  // Get current permission status (mapped to standard 'granted' | 'denied' | 'default')
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

    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  // Synchronous permission getter for initial UI render
  public getPermission(): NotificationPermission {
    if (Capacitor.isNativePlatform()) {
      // In native environment, default to default/granted check asynchronously
      return 'default';
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  // Request system notification permission
  public async requestPermission(): Promise<NotificationPermission> {
    if (Capacitor.isNativePlatform()) {
      try {
        await this.initAndroidChannel();
        const res = await LocalNotifications.requestPermissions();
        if (res.display === 'granted') return 'granted';
        if (res.display === 'denied') return 'denied';
        return 'default';
      } catch (e) {
        console.warn('[HabitNotification] Native requestPermissions error:', e);
        return 'denied';
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        return perm;
      } catch (e) {
        console.warn('[HabitNotification] Web requestPermission error:', e);
        return Notification.permission;
      }
    }

    return 'denied';
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
  public async checkReminders() {
    if (typeof window === 'undefined') return;

    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const currentHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = this.getLocalDateString(now);

    const habits: CheckInType[] = AppStorage.getCheckInTypes();
    const checkInRecords: CheckInRecord[] = AppStorage.getCheckInRecords();

    for (const habit of habits) {
      if (!habit.enabled || !habit.reminder || !habit.reminder.enabled) continue;

      const reminder = habit.reminder;
      const daysOfWeek = reminder.daysOfWeek || [];

      // Check if today is an active day
      if (!daysOfWeek.includes(currentDay)) {
        await this.closeNotification(habit.id);
        continue;
      }

      // Check if user already checked in today for this habit
      const isAlreadyCheckedIn = checkInRecords.some(
        (r) => r.date === todayStr && r.typeId === habit.id
      );

      // 【核心防打扰铁律】：如果我完成了当前习惯打卡通知栏消失；如果我提前完成了打卡即使到提醒时间也不要提醒
      if (isAlreadyCheckedIn) {
        await this.closeNotification(habit.id);
        this.dismissBanner(habit.id);
        continue;
      }

      // Determine reminder trigger time (HH:mm)
      const triggerTime = reminder.reminderTime || reminder.targetStartTime || '21:00';

      // Check if trigger time has arrived today
      if (currentHm >= triggerTime) {
        const todayAlertKey = `habit_alert_${habit.id}_${todayStr}`;
        const alreadyAlerted = localStorage.getItem(todayAlertKey);

        if (!alreadyAlerted) {
          // Fire notification!
          localStorage.setItem(todayAlertKey, currentHm);
          await this.dispatchNotification(habit, todayStr);
        }
      }
    }
  }

  // Send real system notification and in-app banner
  public async dispatchNotification(habit: CheckInType, todayStr: string) {
    const reminder = habit.reminder;
    const timeText =
      reminder?.targetStartTime && reminder?.targetEndTime
        ? `${reminder.targetStartTime} ~ ${reminder.targetEndTime}`
        : reminder?.targetStartTime || reminder?.reminderTime || '';

    const title = `⏰ 习惯打卡提醒：${habit.symbol} ${habit.name}`;
    const body = `该进行「${habit.name}」打卡了！计划时段：${timeText}。打卡完成后通知将自动清除。`;

    // 1. Android Native Local Notification via Capacitor
    if (Capacitor.isNativePlatform()) {
      try {
        await this.initAndroidChannel();
        const numericId = this.getNumericId(habit.id);

        // Cancel previous if any
        try {
          await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
          await LocalNotifications.removeDeliveredNotificationsById({ ids: [numericId] });
        } catch (_) {}

        await LocalNotifications.schedule({
          notifications: [
            {
              id: numericId,
              title,
              body,
              channelId: 'habit-reminders',
              schedule: { at: new Date(Date.now() + 100) },
              extra: { habitId: habit.id, date: todayStr },
            },
          ],
        });
      } catch (err) {
        console.warn('[HabitNotification] Native notification dispatch error:', err);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      // 2. Web Browser Notification
      try {
        this.closeWebNotification(habit.id);

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

        this.activeWebNotifications.set(habit.id, notif);
      } catch (err) {
        console.warn('[HabitNotification] Web notification dispatch error:', err);
      }
    }

    // 3. In-App Floating Banner
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
  public async closeNotification(habitId: string) {
    if (Capacitor.isNativePlatform()) {
      try {
        const numericId = this.getNumericId(habitId);
        await LocalNotifications.cancel({ notifications: [{ id: numericId }] });
        await LocalNotifications.removeDeliveredNotificationsById({ ids: [numericId] });
      } catch (e) {
        console.warn('[HabitNotification] Native cancel error:', e);
      }
    }
    this.closeWebNotification(habitId);
  }

  private closeWebNotification(habitId: string) {
    const active = this.activeWebNotifications.get(habitId);
    if (active) {
      try {
        active.close();
      } catch (_) {}
      this.activeWebNotifications.delete(habitId);
    }
  }

  // Called immediately when user completes a check-in for today
  // 【核心功能】：如果我完成了当前习惯打卡通知栏消失；如果我提前完成了打卡即使到提醒时间也不要提醒
  public async onHabitCompletedToday(habitId: string) {
    const todayStr = this.getLocalDateString(new Date());
    // 1. Close system notification immediately from Android status bar / browser
    await this.closeNotification(habitId);

    // 2. Remove in-app banner
    this.dismissBanner(habitId);

    // 3. Mark alert key so even if reminder time hasn't arrived yet, it will never fire today
    const todayAlertKey = `habit_alert_${habitId}_${todayStr}`;
    localStorage.setItem(todayAlertKey, 'early_completed');
  }

  // Immediate test notification for the user to preview in notification bar
  public async testNotification(habit: CheckInType): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const timeText =
      habit.reminder?.targetStartTime && habit.reminder?.targetEndTime
        ? `${habit.reminder.targetStartTime} ~ ${habit.reminder.targetEndTime}`
        : '21:00 ~ 22:00';

    const title = `⏰ [测试] 习惯打卡提醒：${habit.symbol} ${habit.name}`;
    const body = `计划时段：${timeText}。当您在 App 中点击打卡后，此通知栏提醒将自动消失！`;

    if (Capacitor.isNativePlatform()) {
      try {
        await this.initAndroidChannel();
        const perm = await this.getPermissionAsync();
        if (perm !== 'granted') {
          const req = await this.requestPermission();
          if (req !== 'granted') return false;
        }

        const numericId = this.getNumericId(habit.id);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: numericId,
              title,
              body,
              channelId: 'habit-reminders',
              schedule: { at: new Date(Date.now() + 200) },
              extra: { habitId: habit.id, date: this.getLocalDateString(new Date()) },
            },
          ],
        });
        return true;
      } catch (e: any) {
        console.warn('[HabitNotification] Native test error:', e);
        return false;
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        return false;
      }
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `habit-reminder-test-${habit.id}`,
          requireInteraction: false,
        });
        this.activeWebNotifications.set(habit.id, notif);
        return true;
      } catch (e: any) {
        console.warn('[HabitNotification] Web test error:', e);
        return false;
      }
    }

    return false;
  }

  private getLocalDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export const habitNotificationService = new HabitNotificationService();
