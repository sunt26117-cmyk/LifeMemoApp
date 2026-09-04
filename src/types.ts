// src/types.ts

export type TaskCategory = '沟通' | '学习' | '健康' | '项目' | '情绪' | '习惯' | '规划';

export type TaskStatus = '未开始' | '进行中' | '已完成' | '延期' | '取消';

export type TaskPriority = '高' | '中' | '低';

export type RepeatRule = '无' | '每天' | '每周' | '每月' | '自定义';

export type Emotion = '平静' | '开心' | '紧张' | '焦虑' | '愤怒' | '难过' | '疲惫' | '兴奋' | '满足' | '其他';

export type TrendDirection = '改善' | '稳定' | '恶化';
export type ThemeDirection = TrendDirection;

export type SummaryType = '周' | '月' | '年';

export type DelayType = '外部' | '内部' | '逃避';

export type CancelType = '主动' | '被动' | '逃避';

export interface Memory {
  id: string;
  title: string | null;
  content: string;
  tags: string[];
  aiSummary: string | null;
  relatedMediaIds: string[];
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
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInType {
  id: string;
  name: string; // max 3 Chinese characters, e.g. 学习, 运动, 散步, 早起
  symbol: string; // emoji e.g. 📖, 🏃, 🚶, ⏰
  colorHex?: string;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
}

export interface CheckInRecord {
  id: string;
  date: string; // YYYY-MM-DD
  typeId: string;
  typeName: string;
  symbol: string;
  createdAt: string;
}

export interface TaskStep {
  content: string;
  done: boolean;
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
  estimatedMinutes?: number | null;
  status: TaskStatus;
  steps: TaskStep[];
  sourceReflectionId?: string | null;
  checkInTypeId?: string | null;
  feedback?: TaskFeedback;
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
  citations: Citations;
}

export interface Reflection {
  id: string;
  eventDescription: string;
  emotion: Emotion | string;
  actionTaken?: string | null;
  result?: string | null;
  aiSummary?: ReflectionSummary | null;
  relatedMemoryIds: string[];
  relatedPhotoIds: string[];
  relatedTaskIds: string[];
  relatedSummaryIds: string[];
  isUserConfirmed: boolean;
  pendingAI?: boolean;
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
  periodStart: string;
  periodEnd: string;
  content: string;
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
