// src/components/tasks/TaskStepsTimeline.tsx
import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { Task, TaskStep } from '../../types';
import { ThemeColors } from '../../utils/themeStyles';
import { formatFriendlyDateTime, getStepTimeStatus } from '../../utils/taskTimeUtil';

interface TaskStepsTimelineProps {
  task: Task;
  steps: TaskStep[];
  themeColors: ThemeColors;
  onToggleStep: (stepIdx: number) => void;
}

export const TaskStepsTimeline: React.FC<TaskStepsTimelineProps> = ({
  steps,
  themeColors,
  onToggleStep,
}) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="relative pl-3 mt-2 space-y-2">
      {/* Continuous Vertical timeline track */}
      <div className={`absolute left-5.5 top-3 bottom-3 w-0.5 ${themeColors.progressTrackBg}`} />

      {steps.map((step, idx) => {
        const status = getStepTimeStatus(step);

        return (
          <div key={idx} className="relative flex items-start gap-2.5 group">
            {/* Step Checkbox Node */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStep(idx);
              }}
              className={`z-10 mt-0.5 p-0.5 ${themeColors.cardBg} rounded-full transition-transform active:scale-90`}
              title={step.done ? '标记为未完成' : '标记为已完成'}
            >
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50" />
              ) : step.isDelayed ? (
                <Circle className="w-4 h-4 text-rose-500 hover:text-rose-600" />
              ) : (
                <Circle className={`w-4 h-4 ${themeColors.textSub} hover:${themeColors.primaryText}`} />
              )}
            </button>

            {/* Step Body */}
            <div
              onClick={() => onToggleStep(idx)}
              className={`flex-1 min-w-0 p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                step.isDelayed
                  ? `${themeColors.alertWarningBg} ${themeColors.alertWarningBorder} shadow-2xs`
                  : step.done
                  ? `${themeColors.subtleBg} ${themeColors.subtleBorder} opacity-70`
                  : `${themeColors.cardBg} ${themeColors.cardBorder} shadow-2xs ${themeColors.cardHoverBorder}`
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className={`text-xs font-medium truncate ${
                    step.done ? `line-through ${themeColors.textSub}` : themeColors.textMain
                  }`}
                >
                  <span className={`text-[10px] font-mono ${themeColors.textSub} opacity-70 mr-1.5`}>0{idx + 1}</span>
                  {step.content}
                </span>

                <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                  {step.durationValue != null && (
                    <span className={`px-1.5 py-0.5 rounded-md font-mono ${themeColors.subtleBg} ${themeColors.textSub} border ${themeColors.subtleBorder}`}>
                      {step.durationValue}
                      {step.durationUnit || '天'}
                    </span>
                  )}
                  {status.text && (
                    <span className={`px-1.5 py-0.5 rounded-md font-medium text-[10px] ${status.colorClass}`}>
                      {status.text}
                    </span>
                  )}
                </div>
              </div>

              {step.estimatedDueTime && (
                <div className={`flex items-center gap-1 mt-1 text-[10px] ${themeColors.textSub} opacity-80 font-mono`}>
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  <span>预计截止: {formatFriendlyDateTime(step.estimatedDueTime)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
