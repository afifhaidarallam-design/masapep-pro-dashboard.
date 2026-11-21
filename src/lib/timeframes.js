export const timeframeGroups = [
  { label: 'MINUTES', items: ['M1','M2','M3','M4','M5','M6','M10','M12','M15','M20','M30'] },
  { label: 'HOURS', items: ['H1','H2','H3','H4','H6','H8','H12'] },
  { label: 'LONG TERM', items: ['D1','W1','MN1'] },
];

export const mt5Timeframes = timeframeGroups.flatMap(group => group.items);

export const eaConfiguredTimeframes = ['M1','M5','M15','M30','H1'];

// Dashboard history windows; Y1 candles are aggregated from MN1, not native MT5 periods.
export const dashboardPeriods = ['1D','1W','1M','3M','6M','1Y','3Y','5Y','10Y','ALL'];
