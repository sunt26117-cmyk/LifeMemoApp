// src/utils/lunarUtil.ts
import { Solar, HolidayUtil } from 'lunar-javascript';

/**
 * Accurate Lunar and Chinese Festival Display Utility
 * Uses lunar-javascript for precise astronomical calculations of Chinese lunar calendar,
 * 24 solar terms, statutory holidays, and traditional festivals.
 */
export function getLunarDisplay(date: Date): { text: string; isFestival: boolean } {
  try {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const solar = Solar.fromYmd(year, month, day);
    const lunar = solar.getLunar();

    // 1. Traditional Lunar Festivals (除夕, 春节, 元宵节, 端午节, 七夕节, 中秋节, 重阳节, 腊八节)
    const lunarFestivals = lunar.getFestivals();
    if (lunarFestivals && lunarFestivals.length > 0) {
      return { text: lunarFestivals[0], isFestival: true };
    }

    // 2. Solar Term (24节气, 清明, 立春, 冬至, 白露, etc.)
    const jieQi = lunar.getJieQi();
    if (jieQi) {
      return { text: jieQi, isFestival: true };
    }

    // 3. Solar Festivals (元旦, 劳动节, 国庆节, 妇女节, 儿童节, 教师节)
    const solarFestivals = solar.getFestivals();
    if (solarFestivals && solarFestivals.length > 0) {
      return { text: solarFestivals[0], isFestival: true };
    }

    // 4. Statutory Holiday (法定公休日)
    const holiday = HolidayUtil.getHoliday(year, month, day);
    if (holiday && !holiday.isWork()) {
      return { text: holiday.getName(), isFestival: true };
    }

    // 5. Lunar month beginning (初一 -> 显示月份，如 正月, 八月, 腊月)
    if (lunar.getDay() === 1) {
      return { text: `${lunar.getMonthInChinese()}月`, isFestival: false };
    }

    // 6. Normal Lunar Day (初二, 廿五, etc.)
    return { text: lunar.getDayInChinese(), isFestival: false };
  } catch (err) {
    console.warn('Failed to calculate lunar date for', date, err);
    return { text: `${date.getDate()}日`, isFestival: false };
  }
}

