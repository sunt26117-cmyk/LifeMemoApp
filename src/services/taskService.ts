// src/services/taskService.ts
import { CancelType, CheckInType, DelayType, Task, TaskStatus } from '../types';
import { AppStorage } from './storage';
import { processTaskEvent, TaskTransitionEvent } from './trendEngine';

export interface ChangeTaskStatusParams {
  taskId: string;
  newStatus: TaskStatus;
  durationMinutes?: number;
  behaviorImprovement?: string[];
  delayType?: DelayType | null;
  cancelType?: CancelType | null;
  reason?: string | null;
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

  if (params.newStatus === '已完成') {
    feedback.completedTime = now.toISOString();
    feedback.executionDurationMinutes = params.durationMinutes ?? target.estimatedMinutes ?? 30;
    feedback.behaviorImprovement = params.behaviorImprovement ?? ['按时推进', '专注执行'];
    eventType = 'completed';

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
  } else if (params.newStatus === '延期') {
    feedback.delayType = params.delayType || '内部';
    feedback.reason = params.reason || '事务调整延期';
    eventType = 'delayed';
  } else if (params.newStatus === '取消') {
    feedback.cancelType = params.cancelType || '主动';
    feedback.reason = params.reason || '取消执行';
    eventType = 'cancelled';
  }

  const updatedTask: Task = {
    ...target,
    status: params.newStatus,
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

  return updatedTask;
}
