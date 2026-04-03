import { test, expect } from '@playwright/test';
import { extractAssistantPlan, inferLocalAssistantPlan } from '../src/utils/assistantPlan';

test('local planner creates a scheduled task from Hungarian reminder text', () => {
  const plan = inferLocalAssistantPlan(
    'ma delutan 13 orara ird be hogy vendeglobe kell mennyek',
    new Date('2026-04-04T09:00:00'),
  );

  expect(plan).not.toBeNull();
  expect(plan?.actions).toHaveLength(1);
  expect(plan?.actions[0].type).toBe('create_task');

  if (plan?.actions[0].type === 'create_task') {
    expect(plan.actions[0].data.title).toContain('vendeglobe kell mennyek');
    expect(plan.actions[0].data.date).toBe('2026-04-04T13:00');
  }
});

test('local planner detects financial entry commands', () => {
  const plan = inferLocalAssistantPlan(
    'rogzits egy kiadas 45 eur etterem',
    new Date('2026-04-04T09:00:00'),
  );

  expect(plan).not.toBeNull();
  expect(plan?.actions[0].type).toBe('create_transaction');

  if (plan?.actions[0].type === 'create_transaction') {
    expect(plan.actions[0].data.amount).toBe(45);
    expect(plan.actions[0].data.currency).toBe('EUR');
    expect(plan.actions[0].data.type).toBe('expense');
  }
});

test('local planner keeps the actual money amount when time and amount are both present', () => {
  const plan = inferLocalAssistantPlan(
    'holnap 10 orakor rogzits egy 45 eur kiadast etteremre',
    new Date('2026-04-04T09:00:00'),
  );

  expect(plan).not.toBeNull();
  expect(plan?.actions[0].type).toBe('create_transaction');

  if (plan?.actions[0].type === 'create_transaction') {
    expect(plan.actions[0].data.amount).toBe(45);
    expect(plan.actions[0].data.currency).toBe('EUR');
  }
});

test('local planner can return multiple actions in one sentence', () => {
  const plan = inferLocalAssistantPlan(
    'nyisd meg a napi nezetet es ird be hogy 13 orara vendeglobe kell mennem',
    new Date('2026-04-04T09:00:00'),
  );

  expect(plan).not.toBeNull();
  expect(plan?.actions).toHaveLength(2);
  expect(plan?.actions[0].type).toBe('navigation');
  expect(plan?.actions[1].type).toBe('create_task');
});

test('assistant planner extracts structured JSON response', () => {
  const parsed = extractAssistantPlan(`{
    "reply": "Felvettem.",
    "actions": [
      {
        "type": "create_note",
        "data": {
          "title": "Meeting",
          "content": "Call the client at 14:00"
        }
      }
    ]
  }`);

  expect(parsed).not.toBeNull();
  expect(parsed?.reply).toBe('Felvettem.');
  expect(parsed?.actions).toHaveLength(1);
  expect(parsed?.actions[0].type).toBe('create_note');
});
