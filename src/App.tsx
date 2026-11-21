
import {useMemo,useState} from 'react';
import {Activity,ArrowDownRight,ArrowUpRight,Bell,Bot,CandlestickChart,Check,ChevronDown,ChevronRight,Clock3,Command,Cpu,Eye,Globe2,Gauge,LayoutDashboard,LineChart,LockKeyhole,Menu,MessageCircle,Monitor,Newspaper,RefreshCw,Settings2,ShieldCheck,Signal,SlidersHorizontal,TrendingDown,TrendingUp,Wallet,X,Zap} from 'lucide-react';
import {Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {formatMoney,formatPercent,formatSignedMoney,getWinRate} from './lib/formatters';
import {timeframeGroups,eaConfiguredTimeframes,dashboardPeriods} from './lib/timeframes';
import type { MT5Timeframe } from './lib/timeframes';

type Page='Overview'|'Live Trading'|'Market Intelligence'|'Signal Center'|'Performance'|'Global Gold News'|'EA Command Center'|'Telegram Center'|'System Settings';

const nav:{label:Page;icon:any;group:string}[]=[
{label:'Overview',icon:LayoutDashboard,group:'WORKSPACE'},
{label:'Live Trading',icon:CandlestickChart,group:'WORKSPACE'},
{label:'Market Intelligence',icon:Globe2,group:'INTELLIGENCE'},
{label:'Signal Center',icon:Signal,group:'INTELLIGENCE'},
{label:'Performance',icon:LineChart,group:'ANALYTICS'},
{label:'Global Gold News',icon:Newspaper,group:'ANALYTICS'},
{label:'EA Command Center',icon:Command,group:'CONTROL'},
{label:'Telegram Center',icon:MessageCircle,group:'CONTROL'},
{label:'System Settings',icon:Settings2,group:'SYSTEM'}];

const equity=[
{day:'01',value:10000},{day:'03',value:10018},{day:'05',value:10008},
{day:'07',value:10034},{day:'09',value:10027},{day:'11',value:10055},
{day:'13',value:10046},{day:'15',value:10080},{day:'17',value:10072},
{day:'19',value:10104},{day:'21',value:10128}];

const daily=[
{day:'Mon',pnl:18},{day:'Tue',pnl:-7},{day:'Wed',pnl:26},
{day:'Thu',pnl:12},{day:'Fri',pnl:31},{day:'Sat',pnl:9},{day:'Sun',pnl:21}];

const positions=[
{ticket:'84219031',side:'BUY',lot:'0.02',entry:'2,364.80',current:'2,368.15',sl:'2,361.80',pnl:6.70,duration:'00:18:42'},
{ticket:'84219047',side:'SELL',lot:'0.01',entry:'2,371.20',current:'2,368.15',sl:'2,374.20',pnl:3.05,duration:'00:07:16'}];

const trends=[
['M1','Bullish','Golden cross',78],
['M5','Bullish','Aligned',72],
['M15','Bullish','Uptrend',64],
['M30','Neutral','Consolidation',51],
['H1','Bullish','Trend filter',81],
['H4','Unavailable','Not supplied by EA',0]];

const signals=[
['09:41:12','M1','CONFIRMED BUY','18.42 / 14.86','DEMO'],
['09:36:00','M5','WAIT','43.10 / 39.72','DEMO'],
['09:30:08','H1','UPTREND','61.24 / 55.91','DEMO']];

const news=[
['08:30 WIB','MARKET PREVIEW','Gold market briefing placeholder','News feed not connected'],
['—','ECONOMIC CALENDAR','Upcoming USD event placeholder','Calendar integration pending'],
['—','CENTRAL BANK','Federal Reserve update placeholder','External source required']];

function Badge({children,tone='neutral'}:{children:any;tone?:string}){
return <span className={`badge ${tone}`}><i/>{children}</span>
}

function Panel({title,sub,action,children,className=''}:{title:string;sub?:string;action?:any;children:any;className?:string}){
return <section className={`panel ${className}`}><div className="panel-head"><div><h3>{title}</h3>{sub&&<p>{sub}</p>}</div>{action}</div>{children}</section>
}

function Metric({label,value,change,note,icon:Icon,tone='gold'}:{label:string;value:string;change?:string;note:string;icon:any;tone?:string}){
return <div className="metric"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17}/></span></div><strong>{value}</strong><div className="metric-bottom">{change&&<b className={change.startsWith('-')?'negative':'positive'}>{change}</b>}<small>{note}</small></div></div>
}

function Empty({title,detail}:{title:string;detail:string}){
return <div className="empty"><div><LockKeyhole size={18}/></div><b>{title}</b><span>{detail}</span><Badge tone="warn">Integration pending</Badge></div>
}

function App(){
const [page,setPage]=useState<Page>('Overview');
const [mobile,setMobile]=useState(false);
const [period,setPeriod]=useState('30D');
const [modal,setModal]=useState('');
const [toast,setToast]=useState('');
const [refresh,setRefresh]=useState('09:42:18 WIB');
const [query,setQuery]=useState('');
const [selectedTimeframe,setSelectedTimeframe]=useState<MT5Timeframe>('M5');
const [historicalRange,setHistoricalRange]=useState('1Y');

const winRate=useMemo(()=>getWinRate(42,18),[]);
const navGroups=['WORKSPACE','INTELLIGENCE','ANALYTICS','CONTROL','SYSTEM'];

const trendCards: { tf: MT5Timeframe; bias: string; state: string; strength: number }[] = [
  { tf: 'M1', bias: 'Bullish', state: 'Early trigger', strength: 78 },
  { tf: 'M5', bias: 'Bullish', state: 'Confirmation', strength: 72 },
  { tf: 'M15', bias: 'Bullish', state: 'Structure', strength: 64 },
  { tf: 'M30', bias: 'Neutral', state: 'Context', strength: 51 },
  { tf: 'H1', bias: 'Bullish', state: 'Main trend filter', strength: 81 },
  ...timeframeGroups
    .flatMap((group) => group.items)
    .filter((tf) => !eaConfiguredTimeframes.includes(tf))
    .map((tf) => ({
      tf,
      bias: 'Unavailable',
      state: 'Telemetry pending',
      strength: 0,
    })),
];

const showCommand=(c:string)=>setModal(c);

const confirm=()=>{
const c=modal;
setModal('');
setToast(`${c}: not sent. Secure backend and EA acknowledgement are not configured in this phase.`);
};

const update=()=>{
setRefresh(new Date().toLocaleTimeString('en-GB',{timeZone:'Asia/Jakarta'})+' WIB');
setToast('Preview refreshed. Live data connection is not configured yet.');
};

return <div className="shell">
<aside className={`sidebar ${mobile?'open':''}`}>
<div className="brand">
<div className="brand-icon"><Activity/></div>
<div><b>MASAPEP <em>PRO</em></b><small>TRADING COMMAND CENTER</small></div>
<button className="close-mobile" onClick={()=>setMobile(false)}><X/></button>
</div>

<div className="workspace">
<div className="workspace-mark">M</div>
<div><b>MASAPEP Workspace</b><small>Personal command center</small></div>
<ChevronDown size={15}/>
</div>

<div className="nav-list">
{navGroups.map(g=><div className="nav-group" key={g}>
<label>{g}</label>
{nav.filter(n=>n.group===g&&n.label.toLowerCase().includes(query.toLowerCase())).map(n=>{
const I=n.icon;
return <button key={n.label} className={page===n.label?'active':''} onClick={()=>{setPage(n.label);setMobile(false)}}>
<I size={17}/><span>{n.label}</span>{n.label==='EA Command Center'&&<i className="nav-indicator"/>}
</button>
})}
</div>)}
</div>

<div className="side-bottom">
<div className="help-box"><ShieldCheck size={16}/><div><b>Secure by design</b><small>Setup guide & system status</small></div><ChevronRight size={15}/></div>
<div className="owner"><div className="avatar">A</div><div><b>Workspace Owner</b><small>Local preview · not signed in</small></div></div>
</div>
</aside>

{mobile&&<button className="scrim" onClick={()=>setMobile(false)}/>}

<main className="main">
<header className="topbar">
<div className="crumb">
<button className="mobile-toggle" onClick={()=>setMobile(true)}><Menu/></button>
Workspace <ChevronRight size={14}/><b>{page}</b>
</div>
<div className="top-actions">
<span className="demo-pill"><i/> DEMO ENVIRONMENT</span>
<button className="icon-btn" onClick={update} title="Refresh"><RefreshCw/></button>
<button className="icon-btn bell" onClick={()=>setToast('No live notifications. Integration is pending.')}><Bell/><i/></button>
<div className="owner-mini"><div className="avatar">A</div><span>Owner</span><ChevronDown size={14}/></div>
</div>
</header>

<div className="content">
<div className="page-head">
<div>
<div className="eyebrow">INTELLIGENT TRADING. PRECISION CONTROL.</div>
<h1>{page==='Overview'?'Good morning, welcome back.':page}</h1>
<p>{page==='Overview'?'Here is your MASAPEP ecosystem at a glance.':description(page)}</p>
</div>
<div className="head-actions">
<span><Clock3 size={14}/> Preview · {refresh}</span>
<button className="btn secondary" onClick={update}><RefreshCw size={15}/> Refresh</button>
</div>
</div>

<div className="demo-banner">
<Eye size={17}/>
<div><b>DEMO DATA — NOT CONNECTED TO MT5</b><span>Illustrative interface data only. No live account, market feed, Supabase or trading commands are connected.</span></div>
<button onClick={()=>setPage('System Settings')}>Connection setup <ChevronRight size={14}/></button>
</div>

{page==='Overview'&&<>
<div className="metrics">
<Metric label="Account Balance" value="$10,000.00" change="+2.4%" note="vs. previous period" icon={Wallet}/>
<Metric label="Account Equity" value="$10,128.45" change="+3.1%" note="DEMO snapshot" icon={Gauge}/>
<Metric label="Floating P/L" value="+$128.45" change="+1.28%" note="2 open positions" icon={TrendingUp} tone="green"/>
<Metric label="Today's P/L" value="+$84.20" change="+0.84%" note="Illustrative" icon={Activity} tone="green"/>
</div>

<div className="grid-main">
<Panel title="Account performance" sub="Illustrative equity curve · sample data" action={<span className="legend"><i/> EQUITY <small>DEMO</small></span>}>
<div className="chart-summary">
<b>$10,128.45</b>
<span className="positive"><ArrowUpRight size={14}/> +12.8% <small>sample period</small></span>
<div className="periods"><button className="selected">30D</button><button>90D</button><button>1Y</button></div>
</div>
<div className="chart">
<ResponsiveContainer width="100%" height="100%">
<AreaChart data={equity}>
<defs><linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D6B36A" stopOpacity=".28"/><stop offset="100%" stopColor="#D6B36A" stopOpacity="0"/></linearGradient></defs>
<CartesianGrid stroke="#263247" vertical={false} strokeDasharray="3 5"/>
<XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:'#738096',fontSize:11}}/>
<YAxis axisLine={false} tickLine={false} tick={{fill:'#738096',fontSize:11}} tickFormatter={v=>`$${(v/1000).toFixed(2)}k`}/>
<Tooltip contentStyle={{background:'#111b2b',border:'1px solid #2b3a50',borderRadius:10}} formatter={(v:number)=>[formatMoney(v),'Equity']}/>
<Area dataKey="value" type="monotone" stroke="#D6B36A" strokeWidth={2.4} fill="url(#goldFill)"/>
</AreaChart>
</ResponsiveContainer>
</div>
</Panel>

<Panel title="System health" sub="Connection status overview" action={<button className="text-action" onClick={()=>setPage('System Settings')}>Details <ChevronRight size={13}/></button>}>
{[['MASAPEP Expert Advisor','Awaiting MT5 heartbeat','Not connected',Bot],['MT5 Terminal','No active terminal session','Offline',Monitor],['Supabase Database','Credentials not configured','Pending',Cpu],['Telegram Bot','Existing EA integration not linked to web','Not linked',MessageCircle]].map(([name,detail,status,I]:any)=><div className="health-row" key={name}>
<div className="health-icon"><I size={16}/></div>
<div><b>{name}</b><small>{detail}</small></div>
<Badge tone={status==='Offline'?'bad':'warn'}>{status}</Badge>
</div>)}
<div className="health-foot"><span>Connection checks unavailable</span><button onClick={()=>setPage('System Settings')}>Configure <ChevronRight size={13}/></button></div>
</Panel>
</div>

<div className="grid-bottom">
<Panel title="Live positions" sub="Illustrative open positions" action={<button className="text-action" onClick={()=>setPage('Live Trading')}>View all <ChevronRight size={13}/></button>}>
<Positions compact/>
</Panel>
<Panel title="MASAPEP signal center" sub="Sample signals · not generated by live EA" action={<button className="text-action" onClick={()=>setPage('Signal Center')}>Open center <ChevronRight size={13}/></button>}>
<div className="signal-feature">
<div className="signal-mark"><TrendingUp/></div>
<div><Badge tone="good">DEMO · CONFIRMED BUY</Badge><b>XAUUSD <small>· M1</small></b><span>Stochastic 5,3,3 · K 18.42 / D 14.86</span></div>
<time>09:41:12<small>WIB</small></time>
</div>
<div className="signal-meta"><span>Trend alignment <b className="positive">M1 / M5 / H1 aligned</b></span><span>Signal status <b>Illustrative only</b></span></div>
</Panel>
</div>

<div className="quick">
<div><b>Command shortcuts</b><small>Actions remain disabled until secure command pipeline is ready.</small></div>
<button className="btn secondary" onClick={()=>showCommand('PAUSE EA')}><Command size={15}/> Pause EA</button>
<button className="btn secondary" onClick={()=>showCommand('RESUME EA')}><Zap size={15}/> Resume EA</button>
<button className="btn secondary" onClick={()=>setPage('EA Command Center')}>Command center <ChevronRight size={14}/></button>
</div>
</>}

{page==='Live Trading'&&<>
<div className="metrics three">
<Metric label="Open Positions" value="02" note="1 BUY · 1 SELL" icon={CandlestickChart}/>
<Metric label="Buy Exposure" value="0.02 lot" note="Illustrative" icon={TrendingUp} tone="green"/>
<Metric label="Sell Exposure" value="0.01 lot" note="Illustrative" icon={TrendingDown} tone="red"/>
</div>
<Panel title="Open positions" sub="Sample position data · live account not connected"><Positions/></Panel>
<div className="grid-bottom">
<Panel title="Exposure summary" sub="Illustrative volume split">
<div className="exposure">
<span>BUY <b>66.7%</b></span><div><i style={{width:'66.7%'}}/></div>
<span>SELL <b>33.3%</b></span><div><i className="sell" style={{width:'33.3%'}}/></div>
</div>
</Panel>
<Panel title="Execution notes" sub="Source-of-truth rules">
<p className="rule"><Check/> MT5 EA remains the authoritative execution engine.</p>
<p className="rule"><Check/> Dashboard commands require backend acknowledgement.</p>
<p className="rule"><Check/> No risk parameters can be changed silently.</p>
</Panel>
</div>
</>}

{page==='Market Intelligence'&&<>
<div className="market-hero">
<div><div className="eyebrow">INSTRUMENT · DEMO SNAPSHOT</div><h2>XAUUSD <Badge tone="warn">Sample quote</Badge></h2><p>Gold / US Dollar · External price feed not connected</p></div>
<div className="market-price"><b>2,368.15</b><span className="positive">↗ +0.42% <small>illustrative only</small></span></div>
</div>

<Panel title="Professional multi-timeframe matrix" sub="All standard MT5 periods · choose a timeframe to inspect its telemetry status">
<div className="timeframe-groups">
{timeframeGroups.map(group=><div className="timeframe-group" key={group.label}>
<label>{group.label}</label>
<div className="timeframe-buttons">
{group.items.map(tf=><button key={tf} className={`${selectedTimeframe===tf?'selected':''} ${eaConfiguredTimeframes.includes(tf)?'ea-period':''}`} onClick={()=>setSelectedTimeframe(tf)}>{tf}{eaConfiguredTimeframes.includes(tf)&&<i/>}</button>)}
</div>
</div>)}
</div>
<div className="timeframe-detail">
<div><span>SELECTED PERIOD</span><b>{selectedTimeframe}</b></div>
<div><span>EA SOURCE STATUS</span><b className={eaConfiguredTimeframes.includes(selectedTimeframe)?'status-pending':'status-muted'}>{eaConfiguredTimeframes.includes(selectedTimeframe)?'Configured in inspected V3.09 timeframe set':'Not present in inspected V3.09 timeframe set'}</b></div>
<div><span>LIVE TELEMETRY</span><b>Not connected · DEMO only</b></div>
</div>
<div className="timeframe-legend"><span><i className="legend-dot configured"/> Listed in inspected EA source</span><span><i className="legend-dot unavailable-dot"/> Dashboard period only · EA update required</span></div>
</Panel>

<Panel title="Long-term market history · Annual view" sub="Y1 is derived from monthly (MN1) OHLC history; it is not a native MT5 timeframe">
<div className="annual-toolbar">
<div><span className="eyebrow">HISTORICAL RANGE</span><div className="periods annual-periods">{dashboardPeriods.map(p=><button key={p} className={historicalRange===p?'selected':''} onClick={()=>setHistoricalRange(p)}>{p}</button>)}</div></div>
<Badge tone="warn">Historical feed not connected</Badge>
</div>
<div className="annual-summary">
<div><span>SELECTED RANGE</span><b>{historicalRange}</b></div>
<div><span>ANNUAL CANDLES</span><b>Y1 · 1 candle / year</b></div>
<div><span>DATA SOURCE</span><b>MN1 history → annual OHLC</b></div>
</div>
<div className="annual-empty">
<CandlestickChart size={25}/>
<b>Annual XAUUSD chart awaiting historical data</b>
<p>Once MN1 history is received, MASAPEP PRO will aggregate each calendar year into Open, High, Low, Close and Volume. The selected range will control the visible history window.</p>
<small>No sample prices are shown as real market data.</small>
</div>
<div className="annual-metrics">
<span>Annual Open / High / Low / Close <b>—</b></span>
<span>Year-over-year return <b>—</b></span>
<span>Historical max drawdown <b>—</b></span>
<span>Data coverage <b>Not available</b></span>
</div>
</Panel>

<Panel title="Multi-timeframe trend overview" sub="Sample readings for the five periods currently listed in the inspected EA source; remaining periods await telemetry">
<div className="trend-grid">
{trendCards.map(({tf,bias,state,strength})=>(
<div className={`trend-card ${selectedTimeframe===tf?'focused':''}`} key={tf} onClick={()=>setSelectedTimeframe(tf)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelectedTimeframe(tf)}}>
<div><b>{tf}</b><Badge tone={bias==='Bullish'?'good':bias==='Neutral'?'neutral':'warn'}>{bias}</Badge></div>
<strong>{state}</strong>
{strength>0?<div className="meter"><i style={{width:`${strength}%`}}/></div>:<div className="unavailable">No source data</div>}
<small>{strength?`Illustrative momentum ${strength}/100`:'Waiting for EA telemetry'}</small>
</div>
))}
</div>
</Panel>

<div className="metrics four">
<Metric label="Stochastic 5,3,3" value="18.42 / 14.86" note="K / D · sample" icon={Activity}/>
<Metric label="EMA 20 / 50" value="2,366 / 2,361" note="Sample values" icon={LineChart}/>
<Metric label="RSI 14" value="54.8" note="Sample value" icon={Gauge}/>
<Metric label="ADX 14" value="26.4" note="Sample value" icon={Activity}/>
</div>

<Panel title="Professional analytics modules" sub="Planned monitoring layers — no fabricated live values">
<div className="pro-module-grid">
{[['Risk & exposure monitor','Lot exposure, margin level, risk per trade, daily loss limit'],['Trend confluence engine','M1–MN1 alignment, trend conflicts and strength grading'],['Session intelligence','Asia, London and New York session context'],['Economic event risk','USD calendar, impact level and event countdown'],['Execution quality','Spread, slippage, latency, rejected orders and fills'],['Data integrity & audit','Heartbeat age, source timestamp, gaps and command audit']].map(([name,detail])=>
<div className="pro-module" key={name}><div><ShieldCheck size={16}/><Badge tone="warn">Pending integration</Badge></div><b>{name}</b><span>{detail}</span></div>)}
</div>
</Panel>

<div className="grid-bottom">
<Panel title="Volatility & flow" sub="Technical fields awaiting EA telemetry">
{[['ATR 14','Not connected'],['Accumulation / Distribution','Not connected'],['VWAP','Not connected'],['Bollinger Bands 20,2','Not connected']].map(([a,b])=><div className="tech-row" key={a}><span>{a}</span><b>{b}</b></div>)}
</Panel>
<Panel title="Data provenance & safeguards" sub="Source and freshness must be visible for every value">
<p className="rule"><Badge tone="good">EA signal</Badge> Authenticated data received from MASAPEP.</p>
<p className="rule"><Badge tone="gold">External analysis</Badge> Third-party market feeds.</p>
<p className="rule"><Badge tone="warn">Unavailable</Badge> Never infer missing timeframe or indicator values.</p>
</Panel>
</div>
</>}

{page==='Signal Center'&&<>
<div className="signal-hero">
<div><div className="eyebrow">LATEST SAMPLE STATE</div><h2>WAIT <Badge tone="warn">DEMO ONLY</Badge></h2><p>No authenticated live signal stream is connected.</p></div>
<div className="signal-counters"><div><b>01</b><span>EARLY</span></div><div><b>01</b><span>CONFIRMED</span></div><div><b>01</b><span>WAIT</span></div></div>
</div>
<Panel title="Signal history" sub="Illustrative entries · actual MASAPEP rules remain in EA source">
<div className="table-wrap">
<table><thead><tr><th>TIME (WIB)</th><th>TIMEFRAME</th><th>SIGNAL</th><th>STOCH K / D</th><th>SOURCE</th></tr></thead>
<tbody>{signals.map((s:any,i:number)=><tr key={i}>{s.map((v:string,j:number)=><td key={j}>{j===2?<Badge tone={v.includes('BUY')?'good':v==='WAIT'?'warn':'neutral'}>{v}</Badge>:j===4?<Badge tone="warn">DEMO</Badge>:v}</td>)}</tr>)}</tbody>
</table>
</div>
</Panel>
<div className="grid-bottom">
<Panel title="Signal interpretation" sub="Fields displayed by interface">
{[['Entry price','Awaiting EA payload'],['Trend alignment','Awaiting EA payload'],['Signal timestamp','Asia/Jakarta'],['Signal explanation','Not generated in preview']].map(([a,b])=><div className="tech-row" key={a}><span>{a}</span><b>{b}</b></div>)}
</Panel>
<Panel title="Signal integrity" sub="Frontend is display-only">
<p className="rule"><ShieldCheck/> No strategy logic is implemented in the frontend.</p>
<p className="rule"><ShieldCheck/> EA remains the source of signal truth.</p>
<p className="rule"><ShieldCheck/> No new entry filters are introduced.</p>
</Panel>
</div>
</>}

{page==='Performance'&&<>
<div className="metrics">
<Metric label="Win Rate" value={formatPercent(winRate)} change="+4.2%" note="sample history" icon={TrendingUp} tone="green"/>
<Metric label="Profit Factor" value="1.86" note="illustrative" icon={Gauge}/>
<Metric label="Average Win" value="$18.40" note="sample history" icon={ArrowUpRight} tone="green"/>
<Metric label="Maximum Drawdown" value="4.8%" note="sample history" icon={TrendingDown} tone="red"/>
</div>
<Panel title="Equity curve" sub="Sample performance series · not actual account results" action={<div className="periods">{['7D','30D','90D','1Y'].map(p=><button className={period===p?'selected':''} onClick={()=>setPeriod(p)} key={p}>{p}</button>)}</div>}>
<div className="chart large">
<ResponsiveContainer width="100%" height="100%">
<AreaChart data={equity}>
<CartesianGrid stroke="#263247" vertical={false} strokeDasharray="3 5"/>
<XAxis dataKey="day" tick={{fill:'#738096',fontSize:11}} axisLine={false} tickLine={false}/>
<YAxis tick={{fill:'#738096',fontSize:11}} axisLine={false} tickLine={false}/>
<Tooltip contentStyle={{background:'#111b2b',border:'1px solid #2b3a50'}}/>
<Area dataKey="value" stroke="#D6B36A" fill="#D6B36A" fillOpacity={.12} strokeWidth={2.4}/>
</AreaChart>
</ResponsiveContainer>
</div>
</Panel>
<Panel title="Daily P/L distribution" sub="Sample results by weekday">
<div className="chart large">
<ResponsiveContainer width="100%" height="100%">
<BarChart data={daily}>
<CartesianGrid stroke="#263247" vertical={false} strokeDasharray="3 5"/>
<XAxis dataKey="day" tick={{fill:'#738096',fontSize:11}} axisLine={false} tickLine={false}/>
<YAxis tick={{fill:'#738096',fontSize:11}} axisLine={false} tickLine={false}/>
<Tooltip contentStyle={{background:'#111b2b',border:'1px solid #2b3a50'}}/>
<Bar dataKey="pnl" radius={[5,5,0,0]}>{daily.map((d,i)=><Cell key={i} fill={d.pnl>=0?'#18B981':'#EF4444'}/>)}</Bar>
</BarChart>
</ResponsiveContainer>
</div>
</Panel>
<div className="metrics three">
<Metric label="Total Trades" value="60" note="42 wins · 18 losses" icon={CandlestickChart}/>
<Metric label="Average Loss" value="-$9.90" note="sample history" icon={ArrowDownRight} tone="red"/>
<Metric label="Monthly P/L" value="+$428.60" note="sample history" icon={Activity} tone="green"/>
</div>
</>}

{page==='Global Gold News'&&<>
<div className="news-intro"><Newspaper/><div><b>Global Gold & Macro Intelligence</b><span>Live news providers and economic calendar are not connected in this preview.</span></div><Badge tone="warn">Feed offline</Badge></div>
<div className="news-tags">{['Gold / XAUUSD','US Dollar','Federal Reserve','CPI & PCE','NFP','FOMC','Rates','Geopolitics'].map(x=><span key={x}>{x}</span>)}</div>
<Panel title="Latest market updates" sub="Placeholder cards only — no unverified headline is presented as fact">
{news.map((n,i)=><div className="news-row" key={i}><time>{n[0]}</time><div><Badge>{n[1]}</Badge><b>{n[2]}</b><small>{n[3]}</small></div><span>Unverified</span></div>)}
</Panel>
<Panel title="Economic calendar" sub="Event feed connection pending">
<Empty title="Calendar provider not configured" detail="Connect a trusted economic calendar source before showing event times, impact levels or original links."/>
</Panel>
<div className="notice"><ShieldCheck/> Verified headlines and AI-generated summaries will be labeled separately with source, publication time and original article link.</div>
</>}

{page==='EA Command Center'&&<>
<div className="command-hero">
<div><div className="eyebrow">EXECUTION CONTROL</div><h2>EA is not connected <Badge tone="bad">OFFLINE</Badge></h2><p>Commands are preview-only until backend authorization and EA acknowledgement are implemented.</p></div>
<ShieldCheck size={36}/>
</div>
<div className="command-grid">
{[['Resume EA','Allow entries subject to EA rules','RESUME EA',Zap],['Pause EA','Stop new entries; keep managing positions','PAUSE EA',Command],['Close all positions','Destructive action · confirmation required','CLOSE ALL POSITIONS',X],['Close BUY positions','Destructive action · confirmation required','CLOSE BUY POSITIONS',TrendingDown],['Close SELL positions','Destructive action · confirmation required','CLOSE SELL POSITIONS',TrendingUp]].map(([a,b,c,I]:any)=><button className="command-card" key={c} onClick={()=>showCommand(c)}><I/><b>{a}</b><span>{b}</span></button>)}
</div>
<Panel title="Terminal instances" sub="Single active trading executor per account">
<div className="instance-grid">
{['Windows PC','Windows VPS'].map(x=><div className="instance" key={x}><Monitor/><div><b>{x}</b><small>No heartbeat received</small></div><Badge tone="bad">Not connected</Badge></div>)}
</div>
</Panel>
<Panel title="Command audit trail" sub="No commands have been sent from this preview">
<Empty title="No command records" detail="Authenticated queue, expiry, idempotency and EA acknowledgement belong to the secure backend phase."/>
</Panel>
</>}

{page==='Telegram Center'&&<>
<div className="telegram-hero"><MessageCircle/><div><h2>Telegram integration <Badge tone="warn">Not linked to web</Badge></h2><p>Existing EA Telegram features are preserved. This web panel does not connect directly to your bot.</p></div></div>
<div className="metrics three">
<Metric label="Bot connection" value="Unknown" note="Backend check pending" icon={Bot}/>
<Metric label="Last notification" value="—" note="No web event received" icon={Bell}/>
<Metric label="Last command" value="—" note="No web command sent" icon={Command}/>
</div>
<Panel title="Notification & command history" sub="History will be loaded from authorized backend records">
<Empty title="Telegram event stream not connected" detail="Bot tokens remain server-side only. The browser must never receive Telegram credentials."/>
</Panel>
<Panel title="Supported EA command vocabulary" sub="Current V3.09 command set — actual permissions remain enforced by EA">
<div className="command-tags">{['/status','/balance','/positions','/profit','/pause','/resume','/closeall','/confirm_closeall','/cancel_closeall','/help'].map(x=><code key={x}>{x}</code>)}</div>
</Panel>
</>}

{page==='System Settings'&&<>
<div className="security-callout"><ShieldCheck/><div><b>Security-first configuration</b><span>Do not paste secret keys, Telegram bot tokens or MT5 passwords into frontend settings.</span></div></div>
<div className="settings-grid">
{[['Dashboard authentication','Supabase Auth · email sign-in','Not configured',LockKeyhole],['Supabase database','MASAPEP-TRADING-DATABASE','Credentials pending',Cpu],['MT5 integration','HTTPS telemetry · heartbeat · instance lease','Not connected',Monitor],['Telegram integration','Server-side bot integration','Not linked',MessageCircle],['Risk settings visibility','Read-only display from EA inputs','Not connected',SlidersHorizontal],['Market news providers','RSS + economic calendar','Not connected',Globe2]].map(([a,b,c,I]:any)=><div className="setting-card" key={a}><I/><div><b>{a}</b><span>{b}</span><small>{c}</small></div><ChevronRight/></div>)}
</div>
<Panel title="Environment variables" sub="Browser-safe configuration only">
<div className="env"><code>VITE_SUPABASE_URL</code><Badge tone="warn">Not set</Badge></div>
<div className="env"><code>VITE_SUPABASE_PUBLISHABLE_KEY</code><Badge tone="warn">Not set</Badge></div>
<div className="security-note"><LockKeyhole/> Never add Supabase Secret Key, service_role, Telegram token or privileged EA credentials to VITE_ variables, Netlify frontend environment or GitHub.</div>
</Panel>
<Panel title="Runtime information" sub="Current frontend build">
{[['Application','MASAPEP PRO · Phase 2 frontend'],['Mode','Local demo preview'],['Timezone','Asia/Jakarta (WIB)'],['Trading executor','MT5 EA only']].map(([a,b])=><div className="tech-row" key={a}><span>{a}</span><b>{b}</b></div>)}
</Panel>
</>}

<footer>
<span>© 2026 MASAPEP PRO · MASAPEP | BWK</span>
<span><ShieldCheck size={13}/> Execution authority remains with MT5 EA</span>
<span>Timezone: Asia/Jakarta (WIB)</span>
</footer>
</div>
</main>

{modal&&<div className="overlay">
<div className="dialog">
<button className="dialog-x" onClick={()=>setModal('')}><X/></button>
<div className="dialog-icon"><ShieldCheck/></div>
<h2>Review command request</h2>
<p>You selected <b>{modal}</b>. This preview does not have a secure backend connection, so no command can be queued or executed.</p>
<div className="dialog-warning"><LockKeyhole/> Command execution will be enabled only after authentication, RLS, backend validation, command expiry and EA acknowledgement.</div>
<div className="dialog-actions">
<button className="btn secondary" onClick={()=>setModal('')}>Cancel</button>
<button className="btn primary" onClick={confirm}>Acknowledge preview</button>
</div>
</div>
</div>}

{toast&&<div className="toast"><Check/><span>{toast}</span><button onClick={()=>setToast('')}><X/></button></div>}
</div>
}

function Positions({compact=false}:{compact?:boolean}){
return <div className="table-wrap">
<table>
<thead><tr><th>POSITION</th><th>VOLUME</th><th>ENTRY / CURRENT</th><th>STOP LOSS</th><th>FLOATING P/L</th>{!compact&&<th>DURATION</th>}</tr></thead>
<tbody>{positions.map(p=><tr key={p.ticket}>
<td><div className="position"><Badge tone={p.side==='BUY'?'good':'bad'}>{p.side}</Badge><div><b>XAUUSD</b><small>#{p.ticket}</small></div></div></td>
<td>{p.lot}</td>
<td><b>{p.entry}</b><small>Now {p.current}</small></td>
<td>{p.sl}</td>
<td className="positive">{formatSignedMoney(p.pnl)}</td>
{!compact&&<td>{p.duration}</td>}
</tr>)}</tbody>
</table>
</div>
}

function description(p:Page){
const d:Record<Page,string>={
'Overview':'Your trading ecosystem at a glance.',
'Live Trading':'Monitor open positions and exposure across the connected account.',
'Market Intelligence':'Technical context from the MASAPEP engine and connected market feeds.',
'Signal Center':'Review EA-generated signals without changing strategy rules.',
'Performance':'Evaluate trading outcomes, risk and historical performance.',
'Global Gold News':'Gold, USD, central bank and macroeconomic event monitoring.',
'EA Command Center':'Monitor terminal instances and request controlled EA actions.',
'Telegram Center':'Review notification delivery, command history and integration health.',
'System Settings':'Manage secure connections, terminal instances and account preferences.'
};
return d[p]
}

export default App;
