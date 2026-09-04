// src/constants/colors.ts

export const AppColors = {
  primary: '#57B8E3',
  background: '#FFF8F2',
  neutral: '#98A3B3',
  card: '#FFFFFF',
  success: '#4FBF95',
  warning: '#FF9A5A',
  error: '#FF6B81',
  accent: '#B39DDB',

  // Macaron pastel colors
  softPink: '#FF9EC5',
  softYellow: '#FFD76A',
  mint: '#7ED9B7',
  creamOrange: '#FFB07C',
  lavender: '#B39DDB',
  primaryLight: '#AEE3F5',
  mutedIcon: '#B9C4D6',

  // Module themes
  memoryAccent: '#7ED9B7',
  photoAccent: '#FFB07C',
  reflectionAccent: '#B39DDB',
  taskAccent: '#57B8E3',
  summaryAccent: '#FFD76A',
  noteAccent: '#FFD76A',
};

export const CategoryColors: Record<string, { bg: string; text: string; border: string }> = {
  '沟通': { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
  '学习': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  '健康': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  '项目': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  '情绪': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  '习惯': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  '规划': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
};

export const PriorityColors: Record<string, { dot: string; label: string }> = {
  '高': { dot: 'bg-rose-500', label: 'text-rose-600' },
  '中': { dot: 'bg-amber-500', label: 'text-amber-600' },
  '低': { dot: 'bg-emerald-500', label: 'text-emerald-600' },
};

export const StatusColors: Record<string, { bg: string; text: string }> = {
  '未开始': { bg: 'bg-slate-100', text: 'text-slate-600' },
  '进行中': { bg: 'bg-sky-100', text: 'text-sky-700' },
  '已完成': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  '延期': { bg: 'bg-amber-100', text: 'text-amber-700' },
  '取消': { bg: 'bg-rose-100', text: 'text-rose-700' },
};
