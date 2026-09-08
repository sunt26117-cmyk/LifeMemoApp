// src/services/taskService.ts
import { CancelType, CheckInType, DelayType, Task, TaskStatus, TimeUnit } from '../types';
import { AppStorage } from './storage';
import { processTaskEvent, TaskTransitionEvent } from './trendEngine';
import { calculateNextRecurringDates, computeStepsTimeline } from '../utils/taskTimeUtil';
import { newUuid } from '../utils/uuidUtil';

export interface ChangeTaskStatusParams {
  taskId: string;
  newStatus: TaskStatus;
  durationMinutes?: number;
  durationValue?: number;
  durationUnit?: TimeUnit;
  behaviorImprovement?: string[];
  delayType?: DelayType | null;
  cancelType?: CancelType | null;
  reason?: string | null;
  newStartTime?: string | null;
  newDueTime?: string | null;
}

export function executeTaskStatusTransition(
  params: ChangeTaskStatusParams,
  tasks: Task[],
  checkInTypes: CheckInType[]
) {
  const target = tasks.find((t) => t.id === params.taskId);
  if (!target) return null;

  const now = new Date();
  const feedback = { ...(target.feedback || {}) };
  let eventType: string | null = null;
  let nextGeneratedTask: Task | null = null;

  let taskStartTime = target.startTime;
  let taskDueTime = target.dueTime;
  let taskSteps = target.steps ? [...target.steps] : [];

  if (params.newStatus === '已完成') {
    feedback.completedTime = now.toISOString();
    feedback.executionDurationMinutes = params.durationMinutes ?? target.estimatedMinutes ?? 30;
    feedback.behaviorImprovement = params.behaviorImprovement ?? ['按时推进', '专注执行'];
    eventType = 'completed';

    // 勾选所有子任务为已完成
    taskSteps = taskSteps.map((s) => ({ ...s, done: true }));

    // Auto check-in if associated with checkin type
    if (target.checkInTypeId) {
      const checkType = checkInTypes.find((c) => c.id === target.checkInTypeId);
      if (checkType) {
        const todayStr = now.toISOString().split('T')[0];
        const currentRecords = AppStorage.getCheckInRecords();
        const hasChecked = currentRecords.some(
          (r) => r.date === todayStr && r.typeId === checkType.id
        );
        if (!hasChecked) {
          AppStorage.toggleCheckIn(todayStr, checkType);
        }
      }
    }

    // 若包含重复规则（每天/每周/每月/自定义），在完成当前任务后自动滚入生成下一周期的执行任务
    if (target.repeatRule && target.repeatRule !== '无') {
      const { nextStartTime, nextDueTime } = calculateNextRecurringDates(
        target.startTime,
        target.dueTime,
        target.repeatRule,
        target.customRepeatDetail,
        now
      );

      // 重置子步骤为未完成，并按新周期的开始时间重新推算时间轴
      const resetSteps = (target.steps || []).map((s) => ({
        ...s,
        done: false,
      }));
      const recalculatedSteps = computeStepsTimeline(nextStartTime, resetSteps, now);

      nextGeneratedTask = {
        ...target,
        id: newUuid(),
        createdAt: now.toISOString(),
        status: '未开始',
        startTime: nextStartTime,
        dueTime: nextDueTime,
        steps: recalculatedSteps,
        feedback: undefined,
      };

      AppStorage.upsertTask(nextGeneratedTask);
    }
  } else if (params.newStatus === '延期') {
    feedback.delayType = params.delayType || '内部';
    feedback.reason = params.reason || '事务调整延期';
    eventType = 'delayed';

    // 如果指定了新的开始或截止时间，顺延更新
    if (params.newStartTime) {
      taskStartTime = params.newStartTime;
    }
    if (params.newDueTime !== undefined) {
      taskDueTime = params.newDueTime;
    }
    // 重新按延期后的开始时间重算步骤时间轴
    taskSteps = computeStepsTimeline(taskStartTime, taskSteps, now);
  } else if (params.newStatus === '取消') {
    feedback.cancelType = params.cancelType || '主动';
    feedback.reason = params.reason || '取消执行';
    eventType = 'cancelled';
  }

  const updatedTask: Task = {
    ...target,
    status: params.newStatus,
    startTime: taskStartTime,
    dueTime: taskDueTime,
    steps: taskSteps,
    feedback,
  };

  AppStorage.upsertTask(updatedTask);

  // Trigger TrendEngine if terminal or feedback event
  if (eventType) {
    const ev: TaskTransitionEvent = {
      eventId: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      taskId: target.id,
      taskTitle: target.title,
      categoryValue: target.category,
      event: eventType,
      delta: 0,
      time: now.toISOString(),
      delayType: params.delayType,
      cancelType: params.cancelType,
      behaviorImprovement: params.behaviorImprovement,
    };

    const currentTrends = AppStorage.getTrends();
    const currentThemes = AppStorage.getThemes();
    const { updatedTrends, updatedThemes } = processTaskEvent(ev, currentTrends, currentThemes);
    AppStorage.saveTrends(updatedTrends);
    AppStorage.saveThemes(updatedThemes);
  }

  return { updatedTask, nextGeneratedTask };
}
