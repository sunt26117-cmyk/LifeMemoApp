// src/growth/growthEngine.ts
import { GrowthDirection, GrowthState, GrowthUpdateResult, TaskDifficulty } from '../types';

export class GrowthAlgorithmConfig {
  stabilityLine = 0.7; // 70% 个人稳定线
  sustainCoefficient = 20; // 维持力系数
  momentumCoefficient = 50; // 上升动量系数
  declineCoefficient = 25; // 下降动量系数
  recoveryBonusPerStreak = 2; // 连续上升的恢复加成
  maxRecoveryStreak = 5;
  declineEscalationStep = 0.5; // 连续下降惩罚递增
  maxDeclineEscalationStreak = 5;
  perfectCompletionBonus = 5; // 首次 100% 奖励
  perfectStreakDecayFactor = 0.75;
  perfectStreakDecayFloor = 0.3;
  minRewardFactorBelowLine = 0.3;
  maxSingleStepDelta = 40;
  minSingleStepDelta = -30;
  scoreMin = -100;
  scoreMax = 100;

  constructor(init?: Partial<GrowthAlgorithmConfig>) {
    if (init) Object.assign(this, init);
  }
}

export const DIFFICULTY_MULTIPLIER: Record<TaskDifficulty, number> = {
  easy: 0.8,
  normal: 1.0,
  hard: 1.3,
};

export class GrowthEngine {
  readonly config: GrowthAlgorithmConfig;

  constructor(config = new GrowthAlgorithmConfig()) {
    this.config = config;
  }

  static initial(): GrowthState {
    return {
      score: 0,
      lastCompletionRate: null,
      consecutiveImproveStreak: 0,
      consecutiveDeclineStreak: 0,
      consecutivePerfectStreak: 0,
    };
  }

  computeNext(params: {
    previousState: GrowthState;
    completionRate: number; // 0..1
    difficultyMultiplier?: number;
  }): GrowthUpdateResult {
    const { previousState, completionRate, difficultyMultiplier } = params;
    const r = Math.max(0, Math.min(1, completionRate));
    const prevR = previousState.lastCompletionRate;
    const effectiveMultiplier = difficultyMultiplier ?? DIFFICULTY_MULTIPLIER.normal;

    if (prevR === null) {
      const sustain = this.sustainDelta(r, previousState.consecutivePerfectStreak);
      const delta = this.clampDelta(sustain);
      const newScore = this.clampScore(previousState.score + delta);
      return {
        newState: {
          ...previousState,
          score: newScore,
          lastCompletionRate: r,
          consecutiveImproveStreak: 0,
          consecutiveDeclineStreak: 0,
          consecutivePerfectStreak: r >= 1.0 ? 1 : 0,
        },
        delta,
        direction: 'flat',
      };
    }

    let momentum = 0;
    let direction: GrowthDirection = 'flat';
    let newImproveStreak = 0;
    let newDeclineStreak = 0;

    if (r > prevR) {
      direction = 'up';
      newImproveStreak = previousState.consecutiveImproveStreak + 1;
      newDeclineStreak = 0;

      const rewardFactor = this.rewardFactor(r);
      const recoveryBonus =
        this.config.recoveryBonusPerStreak *
        Math.min(newImproveStreak, this.config.maxRecoveryStreak);
      momentum =
        this.config.momentumCoefficient * (r - prevR) * rewardFactor + recoveryBonus;

      if (r >= 1.0 && prevR < 1.0) {
        momentum += this.config.perfectCompletionBonus;
      }
    } else if (r < prevR) {
      direction = 'down';
      newDeclineStreak = previousState.consecutiveDeclineStreak + 1;
      newImproveStreak = 0;

      const escalation =
        1 +
        this.config.declineEscalationStep *
          (Math.min(newDeclineStreak, this.config.maxDeclineEscalationStreak) - 1);
      momentum = -this.config.declineCoefficient * (prevR - r) * escalation;
    } else {
      direction = 'flat';
      newImproveStreak = 0;
      newDeclineStreak = 0;
      momentum = 0;
    }

    const sustain = this.sustainDelta(r, previousState.consecutivePerfectStreak);
    let rawDelta = sustain + momentum;

    if (rawDelta > 0) {
      rawDelta *= effectiveMultiplier;
    }

    const delta = this.clampDelta(rawDelta);
    const newScore = this.clampScore(previousState.score + delta);
    const newPerfectStreak = r >= 1.0 ? previousState.consecutivePerfectStreak + 1 : 0;

    return {
      newState: {
        score: newScore,
        lastCompletionRate: r,
        consecutiveImproveStreak: newImproveStreak,
        consecutiveDeclineStreak: newDeclineStreak,
        consecutivePerfectStreak: newPerfectStreak,
      },
      delta,
      direction,
    };
  }

  computeSeries(params: {
    initialState: GrowthState;
    completionRates: number[];
    difficultyMultipliers?: number[];
  }): GrowthUpdateResult[] {
    const results: GrowthUpdateResult[] = [];
    let state = params.initialState;
    for (let i = 0; i < params.completionRates.length; i++) {
      const res = this.computeNext({
        previousState: state,
        completionRate: params.completionRates[i],
        difficultyMultiplier: params.difficultyMultipliers?.[i],
      });
      results.push(res);
      state = res.newState;
    }
    return results;
  }

  private sustainDelta(r: number, perfectStreakBefore: number): number {
    const base = this.config.sustainCoefficient * (r - this.config.stabilityLine);
    if (r >= 1.0 && perfectStreakBefore > 0) {
      const decay = Math.max(
        this.config.perfectStreakDecayFloor,
        Math.pow(this.config.perfectStreakDecayFactor, perfectStreakBefore)
      );
      return base * decay;
    }
    return base;
  }

  private rewardFactor(r: number): number {
    if (r >= this.config.stabilityLine) return 1.0;
    const ratio = r / this.config.stabilityLine;
    return ratio < this.config.minRewardFactorBelowLine
      ? this.config.minRewardFactorBelowLine
      : ratio;
  }

  private clampDelta(delta: number): number {
    return Math.max(
      this.config.minSingleStepDelta,
      Math.min(this.config.maxSingleStepDelta, delta)
    );
  }

  private clampScore(score: number): number {
    return Math.max(this.config.scoreMin, Math.min(this.config.scoreMax, score));
  }
}
