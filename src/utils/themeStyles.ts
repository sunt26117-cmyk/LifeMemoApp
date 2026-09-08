// src/utils/themeStyles.ts
import { AppTheme } from '../types';

export interface ThemeColors {
  // Page container & background
  outerBg: string;
  innerBg: string;
  contentBg: string;

  // Header & Navigation
  headerBg: string;
  navBg: string;
  logoGradient: string;
  actionBtn: string;
  activeTabText: string;
  activeTabBg: string;

  // Primary interactive highlights
  primaryText: string;
  primaryBg: string;
  primaryBorder: string;
  primaryHoverBg: string;
  badgeBg: string;
  badgeText: string;

  // Surface cards & containers (Cards, Modals, Panels)
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;

  // Soft tinted secondary containers (item chips, pills, subtle inputs, list rows)
  subtleBg: string;
  subtleBorder: string;
  subtleHoverBg: string;

  // Sub tabs & Segmented controls
  segmentBg: string;
  segmentActiveBg: string;
  segmentActiveText: string;

  // Accent tints for category / tag / stats
  accentWarmBg: string;
  accentWarmText: string;
  accentCoolBg: string;
  accentCoolText: string;
  accentGreenBg: string;
  accentGreenText: string;

  // Dividers & Text
  divider: string;
  textMain: string;
  textMuted: string;
  textSub: string;

  // Theme primary color hex & focus ring
  primaryHex: string;
  focusRing: string;
}

export function getThemeColors(theme: AppTheme): ThemeColors {
  switch (theme) {
    case 'warm':
      return {
        // Warm Theme: 柔和暖阳麦浪 (杏黄暖茶质感，温润不刺眼)
        outerBg: 'bg-[#F4EFEA] text-[#3D332A] selection:bg-amber-200',
        innerBg: 'bg-[#FAF6F0] border-x border-[#EADFCF]',
        contentBg: 'bg-[#FAF6F0]',

        headerBg: 'bg-[#FAF6F0]/95 border-[#EADFCF]',
        navBg: 'bg-[#FAF6F0]/95 border-[#EADFCF]',
        logoGradient: 'from-[#C4753D] to-[#E8A56E]',
        actionBtn: 'bg-[#B86B35] hover:bg-[#9E5828] text-white',
        activeTabText: 'text-[#B86B35]',
        activeTabBg: 'bg-amber-100/70',

        primaryText: 'text-[#B86B35]',
        primaryBg: 'bg-[#B86B35]',
        primaryBorder: 'border-[#E2CEB7]',
        primaryHoverBg: 'hover:bg-[#F3E8DC]',
        badgeBg: 'bg-amber-100/80',
        badgeText: 'text-amber-900',

        // Cards: 温润乳白底，柔和暖褐浅边框
        cardBg: 'bg-[#FFFDF9]',
        cardBorder: 'border-[#EADFCF]',
        cardHoverBorder: 'hover:border-[#DECBB5]',

        // Item chips / list item background
        subtleBg: 'bg-[#F5ECE0]/70',
        subtleBorder: 'border-[#E8DACB]',
        subtleHoverBg: 'hover:bg-[#EFE2D4]',

        // Segments
        segmentBg: 'bg-[#EDE2D3]',
        segmentActiveBg: 'bg-[#FFFDF9]',
        segmentActiveText: 'text-[#4A3828]',

        // Accents
        accentWarmBg: 'bg-amber-100/80',
        accentWarmText: 'text-amber-800',
        accentCoolBg: 'bg-orange-100/70',
        accentCoolText: 'text-orange-800',
        accentGreenBg: 'bg-emerald-100/70',
        accentGreenText: 'text-emerald-800',

        divider: 'border-[#EADFCF]',
        textMain: 'text-[#3D332A]',
        textMuted: 'text-[#7D6F63]',
        textSub: 'text-[#9E8E81]',

        primaryHex: '#B86B35',
        focusRing: 'focus:ring-1 focus:ring-[#B86B35] focus:border-[#B86B35]',
      };

    case 'forest':
      return {
        // Forest Theme: 森意清幽 (淡抹茶薄荷绿，草木自然韵味，清新宁静)
        outerBg: 'bg-[#E7EFE9] text-[#243328] selection:bg-emerald-200',
        innerBg: 'bg-[#F3F8F4] border-x border-[#D5E3D8]',
        contentBg: 'bg-[#F3F8F4]',

        headerBg: 'bg-[#F3F8F4]/95 border-[#D5E3D8]',
        navBg: 'bg-[#F3F8F4]/95 border-[#D5E3D8]',
        logoGradient: 'from-[#3B7D57] to-[#7EC29B]',
        actionBtn: 'bg-[#3B7D57] hover:bg-[#2E6645] text-white',
        activeTabText: 'text-[#3B7D57]',
        activeTabBg: 'bg-emerald-100/70',

        primaryText: 'text-[#3B7D57]',
        primaryBg: 'bg-[#3B7D57]',
        primaryBorder: 'border-[#C8DDD0]',
        primaryHoverBg: 'hover:bg-[#E4EFE7]',
        badgeBg: 'bg-emerald-100/80',
        badgeText: 'text-emerald-900',

        // Cards: 浅淡薄荷白底，草木微青边框
        cardBg: 'bg-[#FAFDFB]',
        cardBorder: 'border-[#D5E3D8]',
        cardHoverBorder: 'hover:border-[#BCD3C2]',

        // Item chips / list item background
        subtleBg: 'bg-[#EAF3EC]/75',
        subtleBorder: 'border-[#D1E2D6]',
        subtleHoverBg: 'hover:bg-[#DFEDE2]',

        // Segments
        segmentBg: 'bg-[#DEEBE1]',
        segmentActiveBg: 'bg-[#FAFDFB]',
        segmentActiveText: 'text-[#203626]',

        // Accents
        accentWarmBg: 'bg-teal-100/80',
        accentWarmText: 'text-teal-800',
        accentCoolBg: 'bg-emerald-100/70',
        accentCoolText: 'text-emerald-800',
        accentGreenBg: 'bg-lime-100/70',
        accentGreenText: 'text-lime-800',

        divider: 'border-[#D5E3D8]',
        textMain: 'text-[#243328]',
        textMuted: 'text-[#5E7365]',
        textSub: 'text-[#84998B]',

        primaryHex: '#3B7D57',
        focusRing: 'focus:ring-1 focus:ring-[#3B7D57] focus:border-[#3B7D57]',
      };

    case 'sky':
    default:
      return {
        // Sky Theme: 静谧晴空 (清爽柔和天青蓝调，高雅透气，拒绝苍白)
        outerBg: 'bg-[#EAF0F7] text-slate-800 selection:bg-sky-200',
        innerBg: 'bg-[#F4F8FC] border-x border-[#DDE8F4]',
        contentBg: 'bg-[#F4F8FC]',

        headerBg: 'bg-[#F4F8FC]/95 border-[#DDE8F4]',
        navBg: 'bg-[#F4F8FC]/95 border-[#DDE8F4]',
        logoGradient: 'from-[#4A90D9] to-[#7ED9B7]',
        actionBtn: 'bg-[#4A90D9] hover:bg-[#3B7EC4] text-white',
        activeTabText: 'text-[#4A90D9]',
        activeTabBg: 'bg-sky-100/70',

        primaryText: 'text-[#4A90D9]',
        primaryBg: 'bg-[#4A90D9]',
        primaryBorder: 'border-[#CDE0F3]',
        primaryHoverBg: 'hover:bg-[#E9F2FB]',
        badgeBg: 'bg-sky-100/80',
        badgeText: 'text-sky-900',

        // Cards: 浅天青柔和亮底，淡蓝灰边框，不再是苍白一片
        cardBg: 'bg-[#FFFFFF]',
        cardBorder: 'border-[#DDE8F4]',
        cardHoverBorder: 'hover:border-[#BDD5EC]',

        // Item chips / list item background
        subtleBg: 'bg-[#EBF2FA]/80',
        subtleBorder: 'border-[#D6E3F2]',
        subtleHoverBg: 'hover:bg-[#DEECF8]',

        // Segments
        segmentBg: 'bg-[#E3EDF7]',
        segmentActiveBg: 'bg-[#FFFFFF]',
        segmentActiveText: 'text-slate-800',

        // Accents
        accentWarmBg: 'bg-amber-100/70',
        accentWarmText: 'text-amber-800',
        accentCoolBg: 'bg-sky-100/70',
        accentCoolText: 'text-sky-800',
        accentGreenBg: 'bg-teal-100/70',
        accentGreenText: 'text-teal-800',

        divider: 'border-[#DDE8F4]',
        textMain: 'text-slate-800',
        textMuted: 'text-slate-600',
        textSub: 'text-slate-500',

        primaryHex: '#4A90D9',
        focusRing: 'focus:ring-1 focus:ring-[#4A90D9] focus:border-[#4A90D9]',
      };
  }
}
