// src/utils/lunarUtil.ts

// Lightweight lunar and festival calculator for Chinese calendar display
const FESTIVALS: Record<string, string> = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆节',
  '12-25': '圣诞节',
};

const LUNAR_FESTIVALS: Record<string, string> = {
  '1-1': '春节',
  '1-15': '元宵',
  '5-5': '端午',
  '7-7': '七夕',
  '8-15': '中秋',
  '9-9': '重阳',
  '12-8': '腊八',
  '12-30': '除夕',
};

const CHINESE_NUMS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

export function getLunarDisplay(date: Date): { text: string; isFestival: boolean } {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const solarKey = `${mm}-${dd}`;

  if (FESTIVALS[solarKey]) {
    return { text: FESTIVALS[solarKey], isFestival: true };
  }

  // Approximate lunar offset based on known epoch
  const baseDate = new Date(2024, 0, 1);
  const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  // 29.53 days per lunar month average
  const lunarDay = ((diffDays + 20) % 30) + 1;
  const lunarMonth = (Math.floor((diffDays + 20) / 29.53) % 12) + 1;

  const lunarKey = `${lunarMonth}-${lunarDay}`;
  if (LUNAR_FESTIVALS[lunarKey]) {
    return { text: LUNAR_FESTIVALS[lunarKey], isFestival: true };
  }

  return { text: CHINESE_NUMS[lunarDay - 1] || '初一', isFestival: false };
}
