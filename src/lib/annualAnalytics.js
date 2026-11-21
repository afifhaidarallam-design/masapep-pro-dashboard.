/** Build annual OHLC candles from chronological monthly OHLC candles (e.g. MT5 MN1 history). */
export function aggregateMonthlyToAnnual(monthlyCandles) {
  if (!Array.isArray(monthlyCandles)) throw new TypeError('Monthly candles must be an array');
  const years = new Map();
  const orderedCandles = [...monthlyCandles].sort((a, b) => new Date(a?.time).getTime() - new Date(b?.time).getTime());
  for (const candle of orderedCandles) {
    const date = new Date(candle?.time);
    const values = [candle?.open, candle?.high, candle?.low, candle?.close];
    if (!Number.isFinite(date.getTime()) || values.some(value => !Number.isFinite(Number(value)))) {
      throw new Error('Invalid monthly candle');
    }
    const year = date.getUTCFullYear();
    const existing = years.get(year);
    if (!existing) {
      years.set(year, { year, open: Number(candle.open), high: Number(candle.high), low: Number(candle.low), close: Number(candle.close), volume: Number(candle.volume ?? 0) });
    } else {
      existing.high = Math.max(existing.high, Number(candle.high));
      existing.low = Math.min(existing.low, Number(candle.low));
      existing.close = Number(candle.close);
      existing.volume += Number(candle.volume ?? 0);
    }
  }
  return [...years.values()].sort((a, b) => a.year - b.year);
}
