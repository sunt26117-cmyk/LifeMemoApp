/// <reference types="vite/client" />

declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
    getFestivals(): string[];
  }

  export class Lunar {
    getDay(): number;
    getDayInChinese(): string;
    getMonthInChinese(): string;
    getFestivals(): string[];
    getJieQi(): string;
  }

  export class HolidayUtil {
    static getHoliday(year: number, month: number, day: number): Holiday | null;
  }

  export class Holiday {
    getName(): string;
    isWork(): boolean;
  }
}
