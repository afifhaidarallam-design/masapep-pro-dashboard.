import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateMonthlyToAnnual } from '../src/lib/annualAnalytics.js';

test('aggregates monthly candles into calendar-year OHLC candles', () => {
  const result = aggregateMonthlyToAnnual([
    { time: '2024-01-01', open: 10, high: 14, low: 8, close: 12, volume: 100 },
    { time: '2024-12-01', open: 12, high: 18, low: 11, close: 16, volume: 200 },
    { time: '2025-01-01', open: 16, high: 20, low: 15, close: 19, volume: 300 },
  ]);
  assert.deepEqual(result, [
    { year: 2024, open: 10, high: 18, low: 8, close: 16, volume: 300 },
    { year: 2025, open: 16, high: 20, low: 15, close: 19, volume: 300 },
  ]);
});

test('returns no annual candles when monthly history is empty', () => {
  assert.deepEqual(aggregateMonthlyToAnnual([]), []);
});

test('rejects malformed monthly candles instead of silently fabricating annual data', () => {
  assert.throws(() => aggregateMonthlyToAnnual([{ time: 'not-a-date', open: 1, high: 2, low: 0, close: 1 }]), /Invalid monthly candle/);
});

test('orders monthly input chronologically before selecting annual open and close', () => {
  const result = aggregateMonthlyToAnnual([
    { time: '2024-12-01', open: 12, high: 14, low: 11, close: 13 },
    { time: '2024-01-01', open: 10, high: 13, low: 9, close: 12 },
  ]);
  assert.equal(result[0].open, 10);
  assert.equal(result[0].close, 13);
});
