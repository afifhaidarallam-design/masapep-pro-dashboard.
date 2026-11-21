export function formatMoney(value,currency='USD'){return new Intl.NumberFormat('en-US',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(value)}
export function formatSignedMoney(value,currency='USD'){const s=formatMoney(Math.abs(value),currency);return value>0?`+${s}`:value<0?`-${s}`:s}
export function getWinRate(wins,losses){const total=wins+losses;return total===0?0:wins/total*100}
export function formatPercent(value,digits=1){return `${Number(value).toFixed(digits)}%`}