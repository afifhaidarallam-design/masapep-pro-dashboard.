import test from 'node:test';
import assert from 'node:assert/strict';
import { mt5Timeframes, timeframeGroups } from '../src/lib/timeframes.js';

test('includes every standard MT5 timeframe from M1 through MN1 in ascending order', () => {
  assert.deepEqual(mt5Timeframes, ['M1','M2','M3','M4','M5','M6','M10','M12','M15','M20','M30','H1','H2','H3','H4','H6','H8','H12','D1','W1','MN1']);
});

test('groups timeframe choices into readable intraday, hourly and long-term ranges', () => {
  assert.deepEqual(timeframeGroups.map(group => group.label), ['MINUTES','HOURS','LONG TERM']);
  assert.equal(timeframeGroups.flatMap(group => group.items).length, mt5Timeframes.length);
});
