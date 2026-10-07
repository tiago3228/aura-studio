export type MonthlyGoalProgress = {
  achieved: number;
  target: number;
  percentage: number;
  remaining: number;
  exceededBy: number;
  reached: boolean;
};

function nonNegativeFinite(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculateMonthlyGoalProgress(
  achievedValue: number,
  targetValue: number,
): MonthlyGoalProgress {
  const achieved = nonNegativeFinite(achievedValue);
  const target = nonNegativeFinite(targetValue);
  const reached = target > 0 && achieved >= target;

  return {
    achieved,
    target,
    percentage: target > 0 ? (achieved / target) * 100 : 0,
    remaining: target > 0 ? Math.max(target - achieved, 0) : 0,
    exceededBy: reached ? achieved - target : 0,
    reached,
  };
}
