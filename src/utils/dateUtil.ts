// src/utils/dateUtil.ts

/**
 * 将 Date 对象格式化为本地日期的 YYYY-MM-DD 字符串
 * 严禁使用 d.toISOString().split('T')[0]，因为 toISOString 会将本地零点转换为 UTC，
 * 在东八区（中国）等正时区会导致日期倒退一天（例如 9月10日 00:00 转为 UTC 9月9日 16:00）！
 */
export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 将 YYYY-MM-DD 格式的字符串解析为本地零点的 Date 对象
 * 严禁使用 new Date('YYYY-MM-DD')，因为 ECMAScript 规范将 ISO 仅日期字符串解析为 UTC 零点，
 * 在本地时区展示时会产生数小时的时差或日期偏移。
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length < 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * 获取当前本地时间的 HH:mm 字符串（例如 "09:25" 或 "21:30"）
 */
export function formatLocalTime(d: Date = new Date()): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 判断两个 YYYY-MM-DD 日期是否为同一天
 */
export function isSameDay(d1: string, d2: string): boolean {
  return d1 === d2;
}

/**
 * 获取指定偏移天数的本地 YYYY-MM-DD 字符串
 */
export function getRelativeLocalDateStr(offsetDays: number = 0, baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offsetDays);
  return formatLocalDate(d);
}
