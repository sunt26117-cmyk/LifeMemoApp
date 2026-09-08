// src/types.ts

export type TaskCategory =
  | '生活日常'
  | '健康作息'
  | '个人学习'
  | '情绪觉察'
  | '休闲放松'
  | '人际沟通'
  | '习惯打卡'
  | '个人财务'
  | '沟通'
  | '学习'
  | '健康'
  | '项目'
  | '情绪'
  | '习惯'
  | '规划'
  | string;

export type AppTheme = 'sky' | 'warm' | 'forest';

export type TaskStatus = '未开始' | '进行中' | '已完成' | '延期' | '取消';

export type TaskPriority = '高' | '中' | '低';

export type RepeatRule = '无' | '每天' | '每周' | '每月' | '自定义';

export type Emotion = '平静' | '开心' | '紧张' | '焦虑' | '愤怒' | '难过' | '疲惫' | '兴奋' | '满足' | '其他';

export type TrendDirection = '改善' | '稳定' | '恶化';
export type ThemeDirection = TrendDirection;

export type SummaryType = '周' | '月' | '年';

export type DelayType = '外部' | '内部' | '逃避';

export type CancelType = '主动' | '被动' | '逃避';

export type LocalStorageStatus = 'downloaded' | 'offloaded';

export interface Memory {
  id: string;
  title: string | null;
  content: string;
  tags: string[];
  aiSummary: string | null;
  relatedMediaIds: string[];
  photos?: string[]; // 支持朋友圈式多图
  locationName?: string | null; // 所在城市/地点
  latitude?: number | null;
  longitude?: number | null;
  localStorageStatus?: LocalStorageStatus;
  isDeleted?: boolean;
  localUpdatedAt?: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  localPath: string; // url or data url
  takenAt: string;
  aiSummary: string | null;
  summaryConfirmed: boolean;
  tags: string[];
  relatedMemoryIds: string[];
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, any>;
  localStorageStatus?: LocalStorageStatus;
  isDeleted?: boolean;
  localUpdatedAt?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  localStorageStatus?: LocalStorageStatus;
  isDeleted?: boolean;
  localUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HabitReminderConfig {
  enabled: boolean;
  daysOfWeek: number[];
  targetStartTime?: string;
  targetEndTime?: string;
  reminderTime: string;
  advanceMinutes?: number;
}

export interface CheckInType {
  id: string;
  name: string; // max 3 Chinese characters, e.g. 学习, 运动, 散步, 早起
  symbol: string; // emoji e.g. 📖, 🏃, 🚶, ⏰
  colorHex?: string;
  sortOrder: number;
  enabled: boolean;
  reminder?: HabitReminderConfig;
  createdAt: string;
}

export interface DeletedRecord {
  id: string;
  collection: string;
  deletedAt?: string;
}

export interface CheckInRecord {
  id: string;
  date: string; // YYYY-MM-DD
  typeId: string;
  typeName: string;
  symbol: string;
  createdAt: string;
  checkInTime?: string; // 精确到分钟的本地时间如 "09:25"
  checkedAt?: string; // 精确到分钟的ISO时间戳字符串
  previousCheckIns?: string[]; // 之前打卡的时间历史，以备将来追溯分析使用
}

export type TimeUnit = '天' | '周' | '月' | '小时' | '分钟';

export interface TaskStep {
  id?: string;
  content: string;
  done: boolean;
  durationValue?: number;
  durationUnit?: TimeUnit;
  estimatedDueTime?: string | null;
  isDelayed?: boolean;
}

export interface TaskFeedback {
  completedTime?: string | null;
  executionDurationMinutes?: number | null;
  behaviorImprovement?: string[];
  delayType?: DelayType | null;
  cancelType?: CancelType | null;
  reason?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  startTime?: string | null;
  dueTime?: string | null;
  reminderTime?: string | null;
  repeatRule: RepeatRule;
  customRepeatDetail?: {
    interval: number;
    unit: '天' | '周' | '月';
  } | null;
  estimatedMinutes?: number | null;
  estimatedDurationValue?: number | null;
  estimatedDurationUnit?: TimeUnit;
  status: TaskStatus;
  steps: TaskStep[];
  sourceReflectionId?: string | null;
  checkInTypeId?: string | null;
  feedback?: TaskFeedback;
  localStorageStatus?: LocalStorageStatus;
  isDeleted?: boolean;
  localUpdatedAt?: string;
  createdAt: string;
}

export interface Citations {
  memoryIds: string[];
  photoIds: string[];
}

export interface ReflectionSummary {
  eventSummary: string;
  goodPoints: string;
  ignoredFactors: string;
  improvementPoints: string;
  nextSuggestion: string;
  suggestedTask: string | null;
  keySuggestion?: string | null; // AI 关键建议（短而精，提点忽略细节）
  citations: Citations;
}

export interface Reflection {
  id: string;
  eventDescription: string;
  emotion: Emotion | string;
  actionTaken?: string | null;
  result?: string | null;
  lessonsLearned?: string | null; // 总结经验（学到了什么、提醒后续注意）
  aiSummary?: ReflectionSummary | null;
  relatedMemoryIds: string[];
  relatedPhotoIds: string[];
  relatedTaskIds: string[];
  relatedSummaryIds: string[];
  isUserConfirmed: boolean;
  pendingAI?: boolean;
  localStorageStatus?: LocalStorageStatus;
  isDeleted?: boolean;
  localUpdatedAt?: string;
  createdAt: string;
}

export interface ContextItem {
  id: string;
  type: 'memory' | 'photo' | 'task' | 'summary';
  titleOrSummary: string;
  date: string;
  tags: string[];
}

export interface ContextPack {
  memories: ContextItem[];
  photos: ContextItem[];
  tasks: ContextItem[];
  summaries: ContextItem[];
}

export interface EvidenceItem {
  eventId: string;
  taskId: string;
  event: string;
  delta: number;
  time: string;
  category: string;
  behaviorImprovement?: string[];
}

export interface Trend {
  id: string;
  trendName: string;
  category: string;
  score: number;
  direction: TrendDirection;
  weight: number;
  evidence: EvidenceItem[];
  cluster: string;
  updatedAt: string;
}

export interface ThemeItem {
  id: string;
  themeName: string;
  weight: number;
  direction: ThemeDirection;
  evidence: EvidenceItem[];
  clusterNames: string[];
  trendNames: string[];
  updatedAt: string;
}

export interface Summary {
  id: string;
  type: SummaryType;
  cycleType?: 'week' | 'month' | 'year';
  periodKey?: string; // 周期唯一标识（周：2026-W36，月：2026-09，年：2026）
  periodStart: string;
  periodEnd: string;
  content: string;
  isFrozen?: boolean; // 是否已跨期封印锁定
  version?: number; // 更新版本号，默认 1
  updatedAt?: string;
  localStorageStatus?: LocalStorageStatus;
  isDeleted?: boolean;
  localUpdatedAt?: string;
  themes: { name: string; direction: ThemeDirection; weight: number }[];
  highlights: string[];
  taskSuggestions: string[];
  annualData?: {
    annualTheme: string;
    highlights: string[];
    behaviorTrend: string;
    moodTrend: string;
    lifeRhythm: string;
    annualReflection: string;
    nextYearSuggestions: string[];
  };
  createdAt: string;
}

export interface AssistSuggestionItem {
  id: string;
  relatedField: 'eventDescription' | 'emotion' | 'actionTaken' | 'result';
  text: string;
  state: 'pending' | 'accepted';
}

export interface AssistSuggestionsState {
  status: 'idle' | 'loading' | 'success' | 'error';
  items: AssistSuggestionItem[];
}

export type TaskDifficulty = 'easy' | 'normal' | 'hard';
export type GrowthDirection = 'up' | 'down' | 'flat';

export interface GrowthState {
  score: number;
  lastCompletionRate: number | null;
  consecutiveImproveStreak: number;
  consecutiveDeclineStreak: number;
  consecutivePerfectStreak: number;
}

export interface GrowthUpdateResult {
  newState: GrowthState;
  delta: number;
  direction: GrowthDirection;
}
