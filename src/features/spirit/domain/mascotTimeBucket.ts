// src/features/spirit/domain/mascotTimeBucket.ts

/**
 * 7 大时间分桶枚举（Strict 24h Time Buckets）
 * 区间统一为左闭右开 [start, end)
 */
export type MascotTimeBucket =
  | 'earlyMorning' // [05:00, 09:00) 清晨元气
  | 'morning'      // [09:00, 11:30) 上午专注
  | 'noon'         // [11:30, 13:30) 午间小憩
  | 'afternoon'    // [13:30, 18:00) 下午提神
  | 'evening'      // [18:00, 20:00) 傍晚治愈
  | 'night'        // [20:00, 23:00) 晚间反思
  | 'lateNight';   // [23:00, 05:00) 深夜催眠

export interface TimeBucketMeta {
  bucket: MascotTimeBucket;
  name: string;
  timeRange: string;
  mood: string;
  theme: string;
  defaultGreeting: string;
}

export const TIME_BUCKET_META_MAP: Record<MascotTimeBucket, TimeBucketMeta> = {
  earlyMorning: {
    bucket: 'earlyMorning',
    name: '清晨元气',
    timeRange: '[05:00, 09:00)',
    mood: '清新充满活力',
    theme: '早晨新的一天开始',
    defaultGreeting: '早安，新的一天元气满满地开始吧！',
  },
  morning: {
    bucket: 'morning',
    name: '上午专注',
    timeRange: '[09:00, 11:30)',
    mood: '沉浸与投入',
    theme: '专注干活，步步推进',
    defaultGreeting: '上午好，专注干活的时间到啦～',
  },
  noon: {
    bucket: 'noon',
    name: '午间小憩',
    timeRange: '[11:30, 13:30)',
    mood: '温饱与休憩',
    theme: '按时吃饭，小憩回血',
    defaultGreeting: '午饭时间到啦，记得按时吃饭哦',
  },
  afternoon: {
    bucket: 'afternoon',
    name: '下午提神',
    timeRange: '[13:30, 18:00)',
    mood: '调整与续航',
    theme: '喝口水伸懒腰，保持节奏',
    defaultGreeting: '下午好，稍微歇一下眼睛，喝口水吧',
  },
  evening: {
    bucket: 'evening',
    name: '傍晚治愈',
    timeRange: '[18:00, 20:00)',
    mood: '释怀与温暖',
    theme: '卸下一天的疲惫',
    defaultGreeting: '辛苦一天啦，晚上好呀～晚风很舒服',
  },
  night: {
    bucket: 'night',
    name: '晚间反思',
    timeRange: '[20:00, 23:00)',
    mood: '沉淀与总结',
    theme: '梳理今日收获，轻装上阵',
    defaultGreeting: '晚上好，今天有什么想记录的瞬间吗？',
  },
  lateNight: {
    bucket: 'lateNight',
    name: '深夜催眠',
    timeRange: '[23:00, 05:00)',
    mood: '安宁与静止',
    theme: '放空思绪，好好睡觉',
    defaultGreeting: '夜深了，早点休息，熬夜很伤身体哦 Zzz',
  },
};

/**
 * 根据本地时间计算所归属的时间桶（依据 24 小时制左闭右开严格划分）
 * @param date 本地时间对象，默认 new Date()
 */
export function getMascotTimeBucket(date: Date = new Date()): MascotTimeBucket {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 05:00 = 300 分钟
  // 09:00 = 540 分钟
  // 11:30 = 690 分钟
  // 13:30 = 810 分钟
  // 18:00 = 1080 分钟
  // 20:00 = 1200 分钟
  // 23:00 = 1380 分钟

  if (totalMinutes >= 300 && totalMinutes < 540) {
    return 'earlyMorning';
  }
  if (totalMinutes >= 540 && totalMinutes < 690) {
    return 'morning';
  }
  if (totalMinutes >= 690 && totalMinutes < 810) {
    return 'noon';
  }
  if (totalMinutes >= 810 && totalMinutes < 1080) {
    return 'afternoon';
  }
  if (totalMinutes >= 1080 && totalMinutes < 1200) {
    return 'evening';
  }
  if (totalMinutes >= 1200 && totalMinutes < 1380) {
    return 'night';
  }
  // [23:00, 24:00) 且 [00:00, 05:00)
  return 'lateNight';
}

/**
 * 是否处于深夜时段（用于静默与休眠状态判定）
 */
export function isMascotLateNight(date: Date = new Date()): boolean {
  return getMascotTimeBucket(date) === 'lateNight';
}
