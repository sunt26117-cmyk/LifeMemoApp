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

  // Homepage 3-Tier Metric Cards Color Adaptation
  metricTasksBg: string;
  metricTasksBorder: string;
  metricTasksText: string;

  metricHabitsBg: string;
  metricHabitsBorder: string;
  metricHabitsText: string;

  metricReflectionsBg: string;
  metricReflectionsBorder: string;
  metricReflectionsText: string;

  // Dedicated Thematic Semantic Tokens for Task & Record Boxes
  progressTrackBg: string;
  statPillBg: string;
  statPillBorder: string;
  quoteBoxBg: string;
  quoteBoxBorder: string;
  quoteBoxText: string;
  alertWarningBg: string;
  alertWarningText: string;
  alertWarningBorder: string;
  inProgressPill: string;
  highPriorityPill: string;
  completionPill: string;
  totalPill: string;
  inProgressCardBorder: string;
}

export function getThemeColors(theme: AppTheme): ThemeColors {
  switch (theme) {
    case 'warm':
      return {
        // Warm Theme: 柔和暖阳麦浪 (温润杏黄暖茶调，舒缓护眼，告别苍白纯白)
        outerBg: 'bg-[#EFE7DD] text-[#3D332A] selection:bg-amber-200',
        innerBg: 'bg-[#F8F2E8] border-x border-[#E4D5C1]',
        contentBg: 'bg-[#F8F2E8]',

        headerBg: 'bg-[#F8F2E8]/95 border-[#E4D5C1]',
        navBg: 'bg-[#F8F2E8]/95 border-[#E4D5C1]',
        logoGradient: 'from-[#B86B35] to-[#E59F67]',
        actionBtn: 'bg-[#B86B35] hover:bg-[#9E5828] text-white',
        activeTabText: 'text-[#B86B35]',
        activeTabBg: 'bg-amber-200/60',

        primaryText: 'text-[#B86B35]',
        primaryBg: 'bg-[#B86B35]',
        primaryBorder: 'border-[#DEC8AF]',
        primaryHoverBg: 'hover:bg-[#F1E4D3]',
        badgeBg: 'bg-amber-100/90',
        badgeText: 'text-amber-900',

        // Cards: 温润燕麦乳白卡片，自然淡暖褐边框
        cardBg: 'bg-[#FFF9EF]',
        cardBorder: 'border-[#E2D2BE]',
        cardHoverBorder: 'hover:border-[#CDB79E]',

        // Item chips / list item background
        subtleBg: 'bg-[#EFE2CF]',
        subtleBorder: 'border-[#DEC8AF]',
        subtleHoverBg: 'hover:bg-[#E8D7C2]',

        // Segments
        segmentBg: 'bg-[#E5D4BF]',
        segmentActiveBg: 'bg-[#FFF9EF]',
        segmentActiveText: 'text-[#4A3420]',

        // Accents
        accentWarmBg: 'bg-amber-100/80',
        accentWarmText: 'text-amber-800',
        accentCoolBg: 'bg-orange-100/70',
        accentCoolText: 'text-orange-800',
        accentGreenBg: 'bg-emerald-100/70',
        accentGreenText: 'text-emerald-800',

        divider: 'border-[#E4D5C1]',
        textMain: 'text-[#3D332A]',
        textMuted: 'text-[#7D6E61]',
        textSub: 'text-[#9E8E81]',

        primaryHex: '#B86B35',
        focusRing: 'focus:ring-1 focus:ring-[#B86B35] focus:border-[#B86B35]',

        // Homepage 3 Metric Cards for Warm Theme
        metricTasksBg: 'bg-[#C66A30]/35',
        metricTasksBorder: 'border-[#F8D4B4]/50',
        metricTasksText: 'text-[#FFE8D6]',

        metricHabitsBg: 'bg-[#DC8D35]/35',
        metricHabitsBorder: 'border-[#FDE3B8]/50',
        metricHabitsText: 'text-[#FFF2DC]',

        metricReflectionsBg: 'bg-[#88421E]/40',
        metricReflectionsBorder: 'border-[#E8B490]/50',
        metricReflectionsText: 'text-[#FCE6DA]',
        // Dedicated Thematic Semantic Tokens for Task & Record Boxes
        progressTrackBg: 'bg-[#EADFCF]',
        statPillBg: 'bg-[#F6EFE5]',
        statPillBorder: 'border-[#E5D7C3]',
        quoteBoxBg: 'bg-gradient-to-r from-[#FDF5EB] to-[#F7EDE0]',
        quoteBoxBorder: 'border-[#B86B35]',
        quoteBoxText: 'text-[#88421E]',
        alertWarningBg: 'bg-[#FDF0E6]',
        alertWarningText: 'text-[#C25828]',
        alertWarningBorder: 'border-[#F5CDAD]',
        inProgressPill: 'bg-[#F9EAD9] border border-[#ECD1B5] text-[#9E5828]',
        highPriorityPill: 'bg-[#FCEAE6] border border-[#F5C9BE] text-[#B54228]',
        completionPill: 'bg-[#EAF2E9] border border-[#CEE0CD] text-[#2F6B38]',
        totalPill: 'bg-[#F3E8DA] border border-[#E2D2C0] text-[#5C4837]',
        inProgressCardBorder: 'border-[#B86B35]/80 ring-1 ring-[#B86B35]/20 shadow-xs',
      };

    case 'forest':
      return {
        // Forest Theme: 森意清幽 (淡抹茶薄荷绿，草木自然韵味，护眼安宁)
        outerBg: 'bg-[#DFECE3] text-[#223528] selection:bg-emerald-200',
        innerBg: 'bg-[#EEF6F1] border-x border-[#CDE1D4]',
        contentBg: 'bg-[#EEF6F1]',

        headerBg: 'bg-[#EEF6F1]/95 border-[#CDE1D4]',
        navBg: 'bg-[#EEF6F1]/95 border-[#CDE1D4]',
        logoGradient: 'from-[#3B7D57] to-[#72B88F]',
        actionBtn: 'bg-[#3B7D57] hover:bg-[#2E6645] text-white',
        activeTabText: 'text-[#3B7D57]',
        activeTabBg: 'bg-emerald-200/60',

        primaryText: 'text-[#3B7D57]',
        primaryBg: 'bg-[#3B7D57]',
        primaryBorder: 'border-[#C4DCCB]',
        primaryHoverBg: 'hover:bg-[#DFEDE3]',
        badgeBg: 'bg-emerald-100/90',
        badgeText: 'text-emerald-900',

        // Cards: 浅淡竹青素纸卡片，清雅微绿边框
        cardBg: 'bg-[#F5FBF7]',
        cardBorder: 'border-[#CADECF]',
        cardHoverBorder: 'hover:border-[#ABC7B3]',

        // Item chips / list item background
        subtleBg: 'bg-[#DFEDE3]',
        subtleBorder: 'border-[#C4DCCB]',
        subtleHoverBg: 'hover:bg-[#D3E5D8]',

        // Segments
        segmentBg: 'bg-[#D3E5D9]',
        segmentActiveBg: 'bg-[#F5FBF7]',
        segmentActiveText: 'text-[#1C3A25]',

        // Accents
        accentWarmBg: 'bg-teal-100/80',
        accentWarmText: 'text-teal-800',
        accentCoolBg: 'bg-emerald-100/70',
        accentCoolText: 'text-emerald-800',
        accentGreenBg: 'bg-lime-100/70',
        accentGreenText: 'text-lime-800',

        divider: 'border-[#CDE1D4]',
        textMain: 'text-[#223528]',
        textMuted: 'text-[#566B5D]',
        textSub: 'text-[#7D9485]',

        primaryHex: '#3B7D57',
        focusRing: 'focus:ring-1 focus:ring-[#3B7D57] focus:border-[#3B7D57]',

        // Homepage 3 Metric Cards for Forest Theme
        metricTasksBg: 'bg-[#18755D]/35',
        metricTasksBorder: 'border-[#8FE4C8]/50',
        metricTasksText: 'text-[#DDF9EF]',

        metricHabitsBg: 'bg-[#2D804B]/35',
        metricHabitsBorder: 'border-[#9FE4B5]/50',
        metricHabitsText: 'text-[#E3F9EC]',

        metricReflectionsBg: 'bg-[#184F35]/40',
        metricReflectionsBorder: 'border-[#85C7A4]/50',
        metricReflectionsText: 'text-[#D9F5E6]',

        // Dedicated Thematic Semantic Tokens for Task & Record Boxes
        progressTrackBg: 'bg-[#D5E3D8]',
        statPillBg: 'bg-[#E5F1E9]',
        statPillBorder: 'border-[#C8DEC0]',
        quoteBoxBg: 'bg-gradient-to-r from-[#EDF7F1] to-[#E3F2E8]',
        quoteBoxBorder: 'border-[#3B7D57]',
        quoteBoxText: 'text-[#1F5435]',
        alertWarningBg: 'bg-[#FEF6EC]',
        alertWarningText: 'text-[#B06A26]',
        alertWarningBorder: 'border-[#F4D7B5]',
        inProgressPill: 'bg-[#E0F2E9] border border-[#C5E7D4] text-[#256B45]',
        highPriorityPill: 'bg-[#FDF0EC] border border-[#F6D2C8] text-[#B54A32]',
        completionPill: 'bg-[#E2F5E9] border border-[#C0ECCF] text-[#1E6B39]',
        totalPill: 'bg-[#E4ECE7] border border-[#CCE0D3] text-[#334D3D]',
        inProgressCardBorder: 'border-[#3B7D57]/80 ring-1 ring-[#3B7D57]/20 shadow-xs',
      };

    case 'sky':
    default:
      return {
        // Sky Theme: 静谧晴空 (清爽天青蓝调，高雅透气，告别苍白)
        outerBg: 'bg-[#E2EDF7] text-slate-800 selection:bg-sky-200',
        innerBg: 'bg-[#F0F5FB] border-x border-[#D3E2F2]',
        contentBg: 'bg-[#F0F5FB]',

        headerBg: 'bg-[#F0F5FB]/95 border-[#D3E2F2]',
        navBg: 'bg-[#F0F5FB]/95 border-[#D3E2F2]',
        logoGradient: 'from-[#4A90D9] to-[#7ED9B7]',
        actionBtn: 'bg-[#4A90D9] hover:bg-[#3B7EC4] text-white',
        activeTabText: 'text-[#4A90D9]',
        activeTabBg: 'bg-sky-200/60',

        primaryText: 'text-[#4A90D9]',
        primaryBg: 'bg-[#4A90D9]',
        primaryBorder: 'border-[#C9DCF0]',
        primaryHoverBg: 'hover:bg-[#E3EFF9]',
        badgeBg: 'bg-sky-100/90',
        badgeText: 'text-sky-900',

        // Cards: 浅天青柔和亮底，淡蓝灰边框，不再是苍白一片
        cardBg: 'bg-[#F7FAFD]',
        cardBorder: 'border-[#D1E1F1]',
        cardHoverBorder: 'hover:border-[#B5CFE7]',

        // Item chips / list item background
        subtleBg: 'bg-[#E1EDF8]',
        subtleBorder: 'border-[#C9DCF0]',
        subtleHoverBg: 'hover:bg-[#D5E5F4]',

        // Segments
        segmentBg: 'bg-[#D4E4F5]',
        segmentActiveBg: 'bg-[#F7FAFD]',
        segmentActiveText: 'text-slate-900',

        // Accents
        accentWarmBg: 'bg-amber-100/70',
        accentWarmText: 'text-amber-800',
        accentCoolBg: 'bg-sky-100/70',
        accentCoolText: 'text-sky-800',
        accentGreenBg: 'bg-teal-100/70',
        accentGreenText: 'text-teal-800',

        divider: 'border-[#D3E2F2]',
        textMain: 'text-slate-800',
        textMuted: 'text-slate-600',
        textSub: 'text-slate-500',

        primaryHex: '#4A90D9',
        focusRing: 'focus:ring-1 focus:ring-[#4A90D9] focus:border-[#4A90D9]',

        // Homepage 3 Metric Cards for Sky Theme
        metricTasksBg: 'bg-sky-500/30',
        metricTasksBorder: 'border-sky-300/50',
        metricTasksText: 'text-sky-100',

        metricHabitsBg: 'bg-teal-500/30',
        metricHabitsBorder: 'border-teal-300/50',
        metricHabitsText: 'text-teal-100',

        metricReflectionsBg: 'bg-indigo-500/30',
        metricReflectionsBorder: 'border-indigo-300/50',
        metricReflectionsText: 'text-indigo-100',

        // Dedicated Thematic Semantic Tokens for Task & Record Boxes
        progressTrackBg: 'bg-[#DDE8F4]',
        statPillBg: 'bg-[#EAF2FA]',
        statPillBorder: 'border-[#CADDF0]',
        quoteBoxBg: 'bg-gradient-to-r from-[#F0F6FD] to-[#E5EFFB]',
        quoteBoxBorder: 'border-[#4A90D9]',
        quoteBoxText: 'text-[#1D4ED8]',
        alertWarningBg: 'bg-[#FEF2F2]',
        alertWarningText: 'text-[#DC2626]',
        alertWarningBorder: 'border-[#FECACA]',
        inProgressPill: 'bg-[#E0F0FE] border border-[#BAE0FD] text-[#0369A1]',
        highPriorityPill: 'bg-[#FFE4E6] border border-[#FECDD3] text-[#BE123C]',
        completionPill: 'bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D]',
        totalPill: 'bg-[#E2E8F0] border border-[#CBD5E1] text-[#334155]',
        inProgressCardBorder: 'border-sky-300 ring-1 ring-sky-100 shadow-xs',
      };
  }
}
