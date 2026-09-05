// src/features/spirit/data/repositories/mascotRepository.ts
import { DEFAULT_MASCOT_LINES } from '../linesData.ts';
import type { MascotGreetingsMap, MascotLinesConfig } from '../models/mascotLinesModel.ts';
import { getMascotTimeBucket, type MascotTimeBucket } from '../../domain/mascotTimeBucket.ts';

const STORAGE_KEY_LAST_DATE = 'mascot_last_greeting_date';
const STORAGE_KEY_LAST_BUCKET = 'mascot_last_greeting_bucket';
const STORAGE_KEY_LAST_ACTIVE = 'mascot_last_active_timestamp';
const STORAGE_KEY_ENABLED = 'mascot_enabled';

export interface GreetingCheckResult {
  /** 是否需要播放完整的中央弹性入场与大问候语流程 (Entering -> Greeting -> Docking) */
  shouldFullGreeting: boolean;
  /** 是否为深夜静默模式（不弹激烈大窗，直接顶栏入睡待机） */
  isLateNightQuiet: boolean;
  /** 触发原因：crossDay | crossBucket | inactiveOver30Min | firstTime | skipToIdle | lateNight */
  reason: 'firstTime' | 'crossDay' | 'crossBucket' | 'inactiveOver30Min' | 'lateNight' | 'skipToIdle';
  currentBucket: MascotTimeBucket;
}

export class MascotRepository {
  private config: MascotLinesConfig = DEFAULT_MASCOT_LINES;

  /** 获取当前配置 */
  public getConfig(): MascotLinesConfig {
    return this.config;
  }

  /** 获取指定时间桶的随机问候语 */
  public getRandomGreeting(bucket: MascotTimeBucket): string {
    const list = this.config.greetings[bucket] || [];
    if (list.length === 0) {
      return '你好呀，今天也要开心自律哦！';
    }
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }

  /** 获取随机闲置台词 */
  public getRandomIdleLine(): string {
    const list = this.config.idle_lines || [];
    if (list.length === 0) return '悄悄看着你变自律～';
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }

  /** 获取随机点击互动台词 */
  public getRandomTapReaction(): string {
    const list = this.config.tap_reactions || [];
    if (list.length === 0) return '戳我干嘛呀～(⁄ ⁄•⁄ω⁄•⁄ ⁄)';
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }

  /** 格式化本地日期为 YYYY-MM-DD */
  public formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** 是否启用小精灵 */
  public isEnabled(): boolean {
    const val = localStorage.getItem(STORAGE_KEY_ENABLED);
    return val === null ? true : val === 'true';
  }

  /** 设置启用/停用小精灵 */
  public setEnabled(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
  }

  /** 获取上一次问候记录 */
  public getLastGreetingInfo(): { date: string | null; bucket: string | null; lastActive: number | null } {
    return {
      date: localStorage.getItem(STORAGE_KEY_LAST_DATE),
      bucket: localStorage.getItem(STORAGE_KEY_LAST_BUCKET),
      lastActive: Number(localStorage.getItem(STORAGE_KEY_LAST_ACTIVE)) || null,
    };
  }

  /**
   * 严格频控判定算法：
   * 1. 深夜特例：23:00~05:00 打开时，即便触发问候，也禁止激烈弹窗，默认以 Sleeping 状态常驻顶栏。
   * 2. 跨天打开（当前日期与存储日期不同） -> 触发完整问候。
   * 3. 同一天内跨时段打开（当前所属 TimeBucket 与存储不同） -> 触发完整问候。
   * 4. 离开后台且时间间隔 ≥ 30分钟 -> 触发完整问候。
   * 5. 同一天且同一时间桶内切回（或离线 < 30分钟） -> 跳过完整问候，以 300ms 快速平滑淡入至 TopIdle。
   */
  public checkGreetingPolicy(now: Date = new Date()): GreetingCheckResult {
    const currentBucket = getMascotTimeBucket(now);
    const todayStr = this.formatDateString(now);

    // 如果处于深夜 [23:00, 05:00)
    if (currentBucket === 'lateNight') {
      return {
        shouldFullGreeting: false,
        isLateNightQuiet: true,
        reason: 'lateNight',
        currentBucket,
      };
    }

    const lastDate = localStorage.getItem(STORAGE_KEY_LAST_DATE);
    const lastBucket = localStorage.getItem(STORAGE_KEY_LAST_BUCKET);
    const lastActiveStr = localStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
    const lastActiveTime = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;

    // 首次打开
    if (!lastDate || !lastBucket) {
      return {
        shouldFullGreeting: true,
        isLateNightQuiet: false,
        reason: 'firstTime',
        currentBucket,
      };
    }

    // 跨天打开
    if (lastDate !== todayStr) {
      return {
        shouldFullGreeting: true,
        isLateNightQuiet: false,
        reason: 'crossDay',
        currentBucket,
      };
    }

    // 同一天内跨时间分桶
    if (lastBucket !== currentBucket) {
      return {
        shouldFullGreeting: true,
        isLateNightQuiet: false,
        reason: 'crossBucket',
        currentBucket,
      };
    }

    // 离开后台间隔 ≥ 30 分钟 (30 * 60 * 1000 = 1,800,000 ms)
    const elapsed = now.getTime() - lastActiveTime;
    if (lastActiveTime > 0 && elapsed >= 30 * 60 * 1000) {
      return {
        shouldFullGreeting: true,
        isLateNightQuiet: false,
        reason: 'inactiveOver30Min',
        currentBucket,
      };
    }

    // 同天同桶且 < 30 分钟：静默快速淡入 TopIdle
    return {
      shouldFullGreeting: false,
      isLateNightQuiet: false,
      reason: 'skipToIdle',
      currentBucket,
    };
  }

  /** 记录问候已播放 */
  public recordGreetingShown(bucket: MascotTimeBucket, now: Date = new Date()): void {
    localStorage.setItem(STORAGE_KEY_LAST_DATE, this.formatDateString(now));
    localStorage.setItem(STORAGE_KEY_LAST_BUCKET, bucket);
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(now.getTime()));
  }

  /** 更新最后活跃时间（用于保活与 30 分钟判断） */
  public updateLastActive(now: Date = new Date()): void {
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(now.getTime()));
  }

  /** 重置问候频控缓存（供测试与手动预览使用） */
  public resetGreetingCache(): void {
    localStorage.removeItem(STORAGE_KEY_LAST_DATE);
    localStorage.removeItem(STORAGE_KEY_LAST_BUCKET);
    localStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
  }
}

export const mascotRepository = new MascotRepository();
