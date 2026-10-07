import assert from "node:assert/strict";
import test from "node:test";
import { calculateMonthlyGoalProgress } from "../src/lib/monthly-goal.ts";

test("calcula percentual e saldo restante antes de atingir a meta", () => {
  assert.deepEqual(calculateMonthlyGoalProgress(25_000, 100_000), {
    achieved: 25_000,
    target: 100_000,
    percentage: 25,
    remaining: 75_000,
    exceededBy: 0,
    reached: false,
  });
});

test("reconhece a meta atingida exatamente, sem saldo restante", () => {
  const progress = calculateMonthlyGoalProgress(50_000, 50_000);
  assert.equal(progress.percentage, 100);
  assert.equal(progress.remaining, 0);
  assert.equal(progress.exceededBy, 0);
  assert.equal(progress.reached, true);
});

test("representa percentual acima de 100% e o valor excedente", () => {
  const progress = calculateMonthlyGoalProgress(125, 100);
  assert.equal(progress.percentage, 125);
  assert.equal(progress.remaining, 0);
  assert.equal(progress.exceededBy, 25);
  assert.equal(progress.reached, true);
});

test("uma meta zero ou inválida não gera percentual nem saldo negativo", () => {
  assert.deepEqual(calculateMonthlyGoalProgress(200, 0), {
    achieved: 200,
    target: 0,
    percentage: 0,
    remaining: 0,
    exceededBy: 0,
    reached: false,
  });
  assert.equal(calculateMonthlyGoalProgress(Number.NaN, 100).achieved, 0);
  assert.equal(calculateMonthlyGoalProgress(-10, 100).achieved, 0);
  assert.equal(calculateMonthlyGoalProgress(100, Number.POSITIVE_INFINITY).target, 0);
});
