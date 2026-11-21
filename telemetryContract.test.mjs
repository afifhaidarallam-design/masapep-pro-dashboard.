import test from 'node:test';
import assert from 'node:assert/strict';
import { mt5Timeframes, eaConfiguredTimeframes, dashboardPeriods } from '../src/lib/timeframes.js';

test('dashboard supports all 21 standard MT5 periods including MN1', () => {
  assert.equal(mt5Timeframes.length, 21);
  assert.deepEqual(mt5Timeframes.slice(-3), ['D1','W1','MN1']);
});

test('annual analysis windows remain available', () => {
  assert.ok(dashboardPeriods.includes('1Y'));
  assert.ok(dashboardPeriods.includes('ALL'));
});

test('EA configured periods are not falsely reported as full timeframe telemetry', () => {
  assert.deepEqual(eaConfiguredTimeframes, ['M1','M5','M15','M30','H1']);
  assert.equal(eaConfiguredTimeframes.includes('MN1'), false);
});
