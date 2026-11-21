
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Bell, Bot,
  CandlestickChart, CheckCircle2, ChevronDown, ChevronRight, Clock3,
  Command, Cpu, Eye, Gauge, Globe2, LayoutDashboard, LineChart,
  LockKeyhole, LogOut, Menu, MessageCircle, Monitor, Newspaper,
  RefreshCw, Settings2, ShieldCheck, Signal, SlidersHorizontal,
  TrendingDown, TrendingUp, Wallet, X, Zap
} from 'lucide-react';

type Page =
  | 'Overview'
  | 'Live Trading'
  | 'Market Intelligence'
  | 'Signal Center'
  | 'Performance'
  | 'Global Gold News'
  | 'EA Command Center'
  | 'Telegram Center'
  | 'System Settings';

type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
  };
};

type Instance = {
  id: string;
  user_id: string;
  instance_name: string;
  account_ref: string;
  broker: string | null;
  platform: string | null;
  symbol: string | null;
  is_active: boolean;
  last_seen_at: string | null;
};

type Heartbeat = {
  instance_id: string;
  connection_status: string;
  ea_version: string | null;
  terminal_name: string | null;
  last_heartbeat_at: string | null;
  message: string | null;
};

type Snapshot = {
  id: string;
  balance: number | null;
  equity: number | null;
  margin: number | null;
  free_margin: number | null;
  margin_level: number | null;
  floating_profit: number | null;
  drawdown_percent: number | null;
  currency: string | null;
  captured_at: string;
};

type DashboardData = {
  instance: Instance | null;
  heartbeat: Heartbeat | null;
  snapshot: Snapshot | null;
  history: Snapshot[];
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const nav: { label: Page; icon: any; group: string }[] = [
  { label: 'Overview', icon: LayoutDashboard, group: 'WORKSPACE' },
  { label: 'Live Trading', icon: CandlestickChart, group: 'WORKSPACE' },
  { label: 'Market Intelligence', icon: Globe2, group: 'INTELLIGENCE' },
  { label: 'Signal Center', icon: Signal, group: 'INTELLIGENCE' },
  { label: 'Performance', icon: LineChart, group: 'ANALYTICS' },
  { label: 'Global Gold News', icon: Newspaper, group: 'ANALYTICS' },
  { label: 'EA Command Center', icon: Command, group: 'CONTROL' },
  { label: 'Telegram Center', icon: MessageCircle, group: 'CONTROL' },
  { label: 'System Settings', icon: Settings2, group: 'SYSTEM' }
];

const money = (value: number | null | undefined, currency = 'USD') => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2
  }).format(Number(value));
};

const number = (value: number | null | undefined, digits = 2) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
};

const dateTime = (value?: string | null) => {
  if (!value) return 'Belum tersedia';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Waktu tidak valid';
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium'
  }) + ' WIB';
};

async function apiRequest<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase ${response.status}: ${detail.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

function Badge({
  children,
  tone = 'neutral'
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}><i />{children}</span>;
}

function Panel({
  title,
  sub,
  action,
  children,
  className = ''
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone = 'gold'
}: {
  label: string;
  value: string;
  note: string;
  icon: any;
  tone?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}><Icon size={17} /></span>
      </div>
      <strong>{value}</strong>
      <div className="metric-bottom"><small>{note}</small></div>
    </div>
  );
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <div><AlertCircle size={18} /></div>
      <b>{title}</b>
      <span>{detail}</span>
      <Badge tone="warn">Belum tersedia</Badge>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>('Overview');
  const [mobile, setMobile] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [data, setData] = useState<DashboardData>({
    instance: null,
    heartbeat: null,
    snapshot: null,
    history: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [lastRefresh, setLastRefresh] = useState('');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState('');

  const configured = Boolean(SUPABASE_URL && SUPABASE_KEY);
  const navGroups = ['WORKSPACE', 'INTELLIGENCE', 'ANALYTICS', 'CONTROL', 'SYSTEM'];

  const isOnline = useMemo(() => {
    const time = data.heartbeat?.last_heartbeat_at;
    if (!time) return false;
    const age = Date.now() - new Date(time).getTime();
    return age >= 0 && age <= 120000 &&
      String(data.heartbeat?.connection_status || '').toUpperCase() === 'ONLINE';
  }, [data.heartbeat]);

  const loadDashboard = useCallback(async (activeSession: Session) => {
    if (!configured) {
      setError('Konfigurasi Supabase belum tersedia. Periksa environment variables GitHub Actions.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userId = activeSession.user.id;
      const filter = `user_id=eq.${encodeURIComponent(userId)}`;

      const [instances, heartbeats, snapshots] = await Promise.all([
        apiRequest<Instance[]>(
          `mt5_instances?select=*&${filter}&order=last_seen_at.desc&limit=10`,
          activeSession.access_token
        ),
        apiRequest<Heartbeat[]>(
          `ea_heartbeat?select=*&${filter}&order=last_heartbeat_at.desc&limit=10`,
          activeSession.access_token
        ),
        apiRequest<Snapshot[]>(
          `account_snapshots?select=*&${filter}&order=captured_at.desc&limit=50`,
          activeSession.access_token
        )
      ]);

      const instance = instances[0] || null;
      const heartbeat = heartbeats.find(
        item => !instance || item.instance_id === instance.id
      ) || null;

      const history = snapshots.filter(
        item => !instance || item.instance_id === instance.id
      );

      setData({
        instance,
        heartbeat,
        snapshot: history[0] || null,
        history
      });

      setLastRefresh(new Date().toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta'
      }) + ' WIB');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    const saved = sessionStorage.getItem('masapep_session');
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Session;
      if (parsed.access_token && parsed.user?.id) {
        setSession(parsed);
      }
    } catch {
      sessionStorage.removeItem('masapep_session');
    }
  }, []);

  useEffect(() => {
    if (session) {
      loadDashboard(session);
    }
  }, [session, loadDashboard]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => loadDashboard(session), 60000);
    return () => window.clearInterval(timer);
  }, [session, loadDashboard]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');

    if (!configured) {
      setLoginError('Supabase URL atau Publishable Key belum dikonfigurasi.');
      return;
    }

    if (!email.trim() || !password) {
      setLoginError('Masukkan email dan password.');
      return;
    }

    setLoginLoading(true);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email.trim(),
            password
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.msg || result.message || result.error_description || 'Login gagal.');
      }

      const newSession: Session = {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_at: result.expires_at,
        user: result.user
      };

      if (!newSession.user?.id || !newSession.access_token) {
        throw new Error('Respons login tidak lengkap.');
      }

      sessionStorage.setItem('masapep_session', JSON.stringify(newSession));
      setSession(newSession);
      setPassword('');
      setToast('Login berhasil.');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login gagal.');
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    if (session && configured) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${session.access_token}`
          }
        });
      } catch {
        // Logout lokal tetap dilakukan.
      }
    }

    sessionStorage.removeItem('masapep_session');
    setSession(null);
    setData({ instance: null, heartbeat: null, snapshot: null, history: [] });
    setPage('Overview');
    setToast('Kamu sudah logout.');
  };

  const refresh = () => {
    if (!session) {
      setToast('Login terlebih dahulu untuk memuat data.');
      return;
    }
    loadDashboard(session);
  };

  const goTo = (target: Page) => {
    setPage(target);
    setMobile(false);
  };

  const statusText = isOnline ? 'ONLINE' : 'OFFLINE';
  const snapshot = data.snapshot;
  const currency = snapshot?.currency || 'USD';

  if (!session) {
    return (
      <div className="shell login-shell">
        <main className="login-main">
          <div className="login-card">
            <div className="brand login-brand">
              <div className="brand-icon"><Activity /></div>
              <div><b>MASAPEP <em>PRO</em></b><small>TRADING COMMAND CENTER</small></div>
            </div>

            <div className="eyebrow">SECURE WORKSPACE ACCESS</div>
            <h1>Welcome back.</h1>
            <p>Login untuk mengakses dashboard MASAPEP PRO dan data akun MT5.</p>

            {!configured && (
              <div className="notice">
                <AlertCircle />
                Supabase belum dikonfigurasi. Tambahkan VITE_SUPABASE_URL dan
                VITE_SUPABASE_PUBLISHABLE_KEY pada GitHub Actions Secrets/Variables.
              </div>
            )}

            <form onSubmit={login} className="login-form">
              <label>Email Supabase</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                autoComplete="username"
                required
              />

              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password akun Supabase"
                autoComplete="current-password"
                required
              />

              {loginError && <div className="form-error">{loginError}</div>}

              <button className="btn primary" type="submit" disabled={loginLoading || !configured}>
                {loginLoading ? 'Memeriksa login...' : 'Login securely'}
              </button>
            </form>

            <div className="security-note">
              <LockKeyhole />
              Login menggunakan Supabase Auth. Jangan masukkan token Telegram,
              service_role key, atau password MT5 di sini.
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><Activity /></div>
          <div><b>MASAPEP <em>PRO</em></b><small>TRADING COMMAND CENTER</small></div>
          <button className="close-mobile" onClick={() => setMobile(false)}><X /></button>
        </div>

        <div className="workspace">
          <div className="workspace-mark">M</div>
          <div><b>MASAPEP Workspace</b><small>{session.user.email || 'Authenticated user'}</small></div>
          <ChevronDown size={15} />
        </div>

        <div className="nav-list">
          {navGroups.map(group => (
            <div className="nav-group" key={group}>
              <label>{group}</label>
              {nav.filter(item =>
                item.group === group &&
                item.label.toLowerCase().includes(query.toLowerCase())
              ).map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className={page === item.label ? 'active' : ''}
                    onClick={() => goTo(item.label)}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {item.label === 'EA Command Center' && <i className="nav-indicator" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="side-bottom">
          <button className="help-box" onClick={() => goTo('System Settings')}>
            <ShieldCheck size={16} />
            <div><b>Secure by design</b><small>Setup guide & system status</small></div>
            <ChevronRight size={15} />
          </button>
          <div className="owner">
            <div className="avatar">{(session.user.email || 'U').charAt(0).toUpperCase()}</div>
            <div><b>{session.user.email || 'Workspace Owner'}</b><small>Authenticated session</small></div>
          </div>
        </div>
      </aside>

      {mobile && <button className="scrim" onClick={() => setMobile(false)} />}

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            <button className="mobile-toggle" onClick={() => setMobile(true)}><Menu /></button>
            Workspace <ChevronRight size={14} /><b>{page}</b>
          </div>
          <div className="top-actions">
            <span className="demo-pill"><i /> {isOnline ? 'LIVE MT5' : 'CONNECTION OFFLINE'}</span>
            <button className="icon-btn" onClick={refresh} title="Refresh"><RefreshCw /></button>
            <button className="icon-btn bell" onClick={() => setToast(error || 'Tidak ada notifikasi baru.')}><Bell /></button>
            <button className="owner-mini" onClick={logout}>
              <div className="avatar">{(session.user.email || 'U').charAt(0).toUpperCase()}</div>
              <span>Logout</span><LogOut size={14} />
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-head">
            <div>
              <div className="eyebrow">INTELLIGENT TRADING. PRECISION CONTROL.</div>
              <h1>{page === 'Overview' ? 'MASAPEP Command Center' : page}</h1>
              <p>{description(page)}</p>
            </div>
            <div className="head-actions">
              <span><Clock3 size={14} /> {lastRefresh || 'Belum diperbarui'}</span>
              <button className="btn secondary" onClick={refresh} disabled={loading}>
                <RefreshCw size={15} /> {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="demo-banner">
            <Eye size={17} />
            <div>
              <b>{isOnline ? 'MT5 TELEMETRY CONNECTED' : 'MT5 NOT CONNECTED / HEARTBEAT STALE'}</b>
              <span>
                {data.instance
                  ? `${data.instance.instance_name} · ${data.instance.broker || 'Broker not reported'} · ${data.instance.account_ref}`
                  : 'Belum ada instance MT5 yang ditemukan untuk akun login ini.'}
              </span>
            </div>
            <button onClick={() => goTo('System Settings')}>
              Connection setup <ChevronRight size={14} />
            </button>
          </div>

          {error && (
            <div className="notice error-notice">
              <AlertCircle />
              <span>{error}</span>
              <button onClick={() => setError('')}><X size={15} /></button>
            </div>
          )}

          {page === 'Overview' && (
            <>
              <div className="metrics">
                <Metric label="Account Balance" value={money(snapshot?.balance, currency)} note="Latest Supabase snapshot" icon={Wallet} />
                <Metric label="Account Equity" value={money(snapshot?.equity, currency)} note="Latest Supabase snapshot" icon={Gauge} />
                <Metric
                  label="Floating P/L"
                  value={money(snapshot?.floating_profit, currency)}
                  note="Reported by MT5 EA"
                  icon={TrendingUp}
                  tone="green"
                />
                <Metric
                  label="Drawdown"
                  value={snapshot?.drawdown_percent == null ? '—' : `${number(snapshot.drawdown_percent)}%`}
                  note="Only when supplied by backend"
                  icon={TrendingDown}
                  tone="red"
                />
              </div>

              <div className="grid-main">
                <Panel title="Account snapshot" sub="Data aktual dari tabel account_snapshots">
                  <div className="account-details">
                    {[
                      ['Margin', money(snapshot?.margin, currency)],
                      ['Free margin', money(snapshot?.free_margin, currency)],
                      ['Margin level', snapshot?.margin_level == null ? '—' : `${number(snapshot.margin_level)}%`],
                      ['Currency', currency],
                      ['Captured at', dateTime(snapshot?.captured_at)]
                    ].map(([label, value]) => (
                      <div className="tech-row" key={label}>
                        <span>{label}</span><b>{value}</b>
                      </div>
                    ))}
                  </div>
                  {!snapshot && <Empty title="Belum ada snapshot akun" detail="Pastikan EA mengirim telemetry dan Supabase menerima data account_snapshots." />}
                </Panel>

                <Panel
                  title="System health"
                  sub="Status berdasarkan heartbeat MT5"
                  action={<button className="text-action" onClick={() => goTo('System Settings')}>Details <ChevronRight size={13} /></button>}
                >
                  <div className="health-row">
                    <div className="health-icon"><Bot size={16} /></div>
                    <div><b>MASAPEP Expert Advisor</b><small>Version {data.heartbeat?.ea_version || '—'}</small></div>
                    <Badge tone={isOnline ? 'good' : 'bad'}>{statusText}</Badge>
                  </div>
                  <div className="health-row">
                    <div className="health-icon"><Monitor size={16} /></div>
                    <div><b>MT5 Terminal</b><small>{data.heartbeat?.terminal_name || 'No terminal reported'}</small></div>
                    <Badge tone={isOnline ? 'good' : 'bad'}>{isOnline ? 'Online' : 'Offline'}</Badge>
                  </div>
                  <div className="health-row">
                    <div className="health-icon"><Cpu size={16} /></div>
                    <div><b>Supabase Database</b><small>Authenticated REST connection</small></div>
                    <Badge tone="good">Connected</Badge>
                  </div>
                  <div className="health-row">
                    <div className="health-icon"><MessageCircle size={16} /></div>
                    <div><b>Telegram Bot</b><small>MT5-side Telegram is not verified by this dashboard</small></div>
                    <Badge tone="warn">Not verified</Badge>
                  </div>
                  <div className="health-foot">
                    <span>Heartbeat: {dateTime(data.heartbeat?.last_heartbeat_at)}</span>
                    <button onClick={refresh}>Check now <ChevronRight size={13} /></button>
                  </div>
                </Panel>
              </div>

              <Panel title="MT5 instance" sub="Identitas terminal yang mengirim telemetry">
                {data.instance ? (
                  <div className="instance-grid">
                    <div className="instance"><Monitor /><div><b>{data.instance.instance_name}</b><small>{data.instance.terminal_name || data.heartbeat?.terminal_name || 'Terminal'}</small></div><Badge tone={isOnline ? 'good' : 'bad'}>{statusText}</Badge></div>
                    <div className="instance"><Cpu /><div><b>{data.instance.broker || 'Broker not reported'}</b><small>{data.instance.platform || 'MT5'} · {data.instance.symbol || 'Symbol not reported'}</small></div><Badge tone="neutral">{data.heartbeat?.ea_version || 'EA version —'}</Badge></div>
                  </div>
                ) : (
                  <Empty title="MT5 instance belum ditemukan" detail="Periksa user_id, account_ref, allowlist, dan Edge Function telemetry." />
                )}
              </Panel>
            </>
          )}

          {page === 'Live Trading' && (
            <>
              <div className="metrics three">
                <Metric label="Account Balance" value={money(snapshot?.balance, currency)} note="Latest snapshot" icon={Wallet} />
                <Metric label="Account Equity" value={money(snapshot?.equity, currency)} note="Latest snapshot" icon={Gauge} />
                <Metric label="Floating P/L" value={money(snapshot?.floating_profit, currency)} note="MT5 reported value" icon={Activity} />
              </div>
              <Panel title="Open positions" sub="Data posisi belum dikirim oleh telemetry saat ini">
                <Empty title="Position feed belum tersedia" detail="Tabel account_snapshots hanya menyimpan ringkasan akun. Dibutuhkan endpoint dan tabel posisi tersendiri untuk menampilkan tiket, arah, lot, entry, SL, dan TP." />
              </Panel>
              <Panel title="Margin & exposure" sub="Data akun aktual">
                {[
                  ['Margin', money(snapshot?.margin, currency)],
                  ['Free margin', money(snapshot?.free_margin, currency)],
                  ['Margin level', snapshot?.margin_level == null ? '—' : `${number(snapshot.margin_level)}%`]
                ].map(([a, b]) => <div className="tech-row" key={a}><span>{a}</span><b>{b}</b></div>)}
              </Panel>
            </>
          )}

          {page === 'Market Intelligence' && (
            <>
              <div className="market-hero">
                <div><div className="eyebrow">MT5 SYMBOL</div><h2>{data.instance?.symbol || 'XAUUSD'}</h2><p>Harga pasar langsung belum dikirim oleh telemetry.</p></div>
                <div className="market-price"><b>—</b><span>Live quote unavailable</span></div>
              </div>
              <Panel title="Multi-timeframe intelligence" sub="Menunggu payload indikator dari EA">
                <Empty title="Belum ada data indikator" detail="Heartbeat dan snapshot akun tidak mencakup Stochastic, EMA, RSI, ADX, VWAP, atau tren M1 sampai H4. Diperlukan tambahan payload telemetry dari EA." />
              </Panel>
              <Panel title="Data integrity" sub="Sumber data yang ditampilkan">
                <p className="rule"><Badge tone="good">Verified source</Badge> Balance, equity, margin, floating P/L berasal dari snapshot Supabase.</p>
                <p className="rule"><Badge tone="warn">Not supplied</Badge> Harga XAUUSD dan indikator teknikal belum tersedia.</p>
                <p className="rule"><Badge tone="warn">Not supplied</Badge> Berita global dan kalender ekonomi belum terhubung.</p>
              </Panel>
            </>
          )}

          {page === 'Signal Center' && (
            <Panel title="Signal stream" sub="Sinyal aktual harus berasal dari EA, bukan frontend">
              <Empty title="Belum ada data sinyal" detail="Telemetry saat ini hanya menerima heartbeat dan snapshot akun. Belum ada tabel atau payload signal history yang terhubung." />
            </Panel>
          )}

          {page === 'Performance' && (
            <>
              <div className="metrics">
                <Metric label="Balance" value={money(snapshot?.balance, currency)} note="Latest snapshot" icon={Wallet} />
                <Metric label="Equity" value={money(snapshot?.equity, currency)} note="Latest snapshot" icon={Gauge} />
                <Metric label="Floating P/L" value={money(snapshot?.floating_profit, currency)} note="Current snapshot" icon={TrendingUp} tone="green" />
                <Metric label="Drawdown" value={snapshot?.drawdown_percent == null ? '—' : `${number(snapshot.drawdown_percent)}%`} note="Backend supplied only" icon={TrendingDown} tone="red" />
              </div>
              <Panel title="Account snapshot history" sub="Riwayat account_snapshots dari Supabase">
                {data.history.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>TIME (WIB)</th><th>BALANCE</th><th>EQUITY</th><th>FLOATING P/L</th><th>MARGIN</th></tr></thead>
                      <tbody>
                        {data.history.map(item => (
                          <tr key={item.id}>
                            <td>{dateTime(item.captured_at)}</td>
                            <td>{money(item.balance, item.currency || currency)}</td>
                            <td>{money(item.equity, item.currency || currency)}</td>
                            <td>{money(item.floating_profit, item.currency || currency)}</td>
                            <td>{money(item.margin, item.currency || currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title="Riwayat belum tersedia" detail="Belum ada account_snapshots untuk akun login ini." />
                )}
              </Panel>
            </>
          )}

          {page === 'Global Gold News' && (
            <>
              <div className="news-intro">
                <Newspaper />
                <div><b>Global Gold & Macro Intelligence</b><span>News feed belum terhubung ke provider eksternal.</span></div>
                <Badge tone="warn">Feed offline</Badge>
              </div>
              <Panel title="Gold market news" sub="Tidak menampilkan headline fiktif">
                <Empty title="News provider belum dikonfigurasi" detail="Hubungkan penyedia berita atau RSS melalui backend sebelum menampilkan berita emas dan kalender ekonomi." />
              </Panel>
            </>
          )}

          {page === 'EA Command Center' && (
            <>
              <div className="command-hero">
                <div>
                  <div className="eyebrow">EXECUTION CONTROL</div>
                  <h2>EA {isOnline ? 'Connected' : 'Offline'} <Badge tone={isOnline ? 'good' : 'bad'}>{statusText}</Badge></h2>
                  <p>Dashboard ini masih dalam mode telemetry-only. Tidak ada perintah trading yang dikirim.</p>
                </div>
                <ShieldCheck size={36} />
              </div>
              <div className="command-grid">
                {[
                  ['Resume EA', 'Belum tersedia', Zap],
                  ['Pause EA', 'Belum tersedia', Command],
                  ['Close all positions', 'Belum tersedia', X],
                  ['Close BUY positions', 'Belum tersedia', TrendingDown],
                  ['Close SELL positions', 'Belum tersedia', TrendingUp]
                ].map(([name, detail, Icon]: any) => (
                  <button className="command-card" key={name} disabled title="Command pipeline belum diaktifkan">
                    <Icon /><b>{name}</b><span>{detail}</span>
                  </button>
                ))}
              </div>
              <Panel title="Command security" sub="Kontrol tetap nonaktif sampai backend command queue diuji">
                <p className="rule"><ShieldCheck /> EA tetap menjadi satu-satunya eksekutor transaksi.</p>
                <p className="rule"><ShieldCheck /> Command queue belum diaktifkan.</p>
                <p className="rule"><ShieldCheck /> Tidak ada tombol yang dapat membuka atau menutup transaksi dari dashboard ini.</p>
              </Panel>
            </>
          )}

          {page === 'Telegram Center' && (
            <>
              <div className="telegram-hero">
                <MessageCircle />
                <div><h2>Telegram integration <Badge tone="warn">Not linked</Badge></h2><p>Token Telegram yang dimasukkan langsung di MT5 tidak otomatis tersedia di dashboard.</p></div>
              </div>
              <Panel title="Telegram connection" sub="Integrasi server-side belum disiapkan">
                <Empty title="Telegram belum terhubung ke dashboard" detail="Jangan masukkan bot token ke App.tsx, browser, GitHub repository, atau VITE environment variable. Integrasi web harus menggunakan backend yang menyimpan token sebagai secret." />
              </Panel>
              <Panel title="Existing MT5 Telegram" sub="Pengiriman notifikasi dari EA tetap terpisah">
                <p className="rule"><ShieldCheck /> Fitur Telegram pada EA tidak diubah oleh dashboard ini.</p>
                <p className="rule"><ShieldCheck /> Dashboard belum dapat membaca riwayat pesan dari bot.</p>
                <p className="rule"><ShieldCheck /> Jangan membagikan token bot atau Chat ID rahasia di percakapan.</p>
              </Panel>
            </>
          )}

          {page === 'System Settings' && (
            <>
              <div className="security-callout">
                <ShieldCheck />
                <div><b>Security-first configuration</b><span>Credential sensitif hanya boleh berada di server atau GitHub Secrets, bukan di frontend.</span></div>
              </div>

              <div className="settings-grid">
                {[
                  ['Dashboard authentication', session.user.email || 'Authenticated user', 'Connected', LockKeyhole],
                  ['Supabase database', SUPABASE_URL || 'URL not configured', configured ? 'Configured' : 'Missing', Cpu],
                  ['MT5 integration', data.instance?.instance_name || 'No instance found', isOnline ? 'Online' : 'Offline', Monitor],
                  ['Telegram integration', 'Server-side integration required', 'Not linked', MessageCircle],
                  ['Risk settings visibility', 'Read-only telemetry only', 'Not supplied', SlidersHorizontal],
                  ['Market news providers', 'RSS + economic calendar', 'Not configured', Globe2]
                ].map(([name, detail, status, Icon]: any) => (
                  <div className="setting-card" key={name}>
                    <Icon />
                    <div><b>{name}</b><span>{detail}</span><small>{status}</small></div>
                    <ChevronRight />
                  </div>
                ))}
              </div>

              <Panel title="Connection diagnostics" sub="Pemeriksaan status integrasi">
                {[
                  ['Supabase URL', SUPABASE_URL ? 'Available' : 'Missing'],
                  ['Publishable key', SUPABASE_KEY ? 'Available' : 'Missing'],
                  ['Authenticated user', session.user.id],
                  ['MT5 instance', data.instance?.id || 'Not found'],
                  ['Heartbeat', dateTime(data.heartbeat?.last_heartbeat_at)],
                  ['Snapshot', dateTime(snapshot?.captured_at)]
                ].map(([a, b]) => <div className="tech-row" key={a}><span>{a}</span><b>{b}</b></div>)}
                <div className="health-foot">
                  <span>Last check: {lastRefresh || '—'}</span>
                  <button onClick={refresh}>Run check <ChevronRight size={13} /></button>
                </div>
              </Panel>

              <Panel title="Environment variables" sub="Frontend-safe variables only">
                <div className="env"><code>VITE_SUPABASE_URL</code><Badge tone={SUPABASE_URL ? 'good' : 'warn'}>{SUPABASE_URL ? 'Configured' : 'Missing'}</Badge></div>
                <div className="env"><code>VITE_SUPABASE_PUBLISHABLE_KEY</code><Badge tone={SUPABASE_KEY ? 'good' : 'warn'}>{SUPABASE_KEY ? 'Configured' : 'Missing'}</Badge></div>
                <div className="security-note">
                  <LockKeyhole />
                  Jangan pernah memasukkan SUPABASE_SERVICE_ROLE_KEY, Telegram bot token,
                  ingest token, atau password MT5 ke variabel VITE_.
                </div>
              </Panel>
            </>
          )}

          <footer>
            <span>© 2026 MASAPEP PRO · MASAPEP | BWK</span>
            <span><ShieldCheck size={13} /> Execution authority remains with MT5 EA</span>
            <span>Timezone: Asia/Jakarta (WIB)</span>
          </footer>
        </div>
      </main>

      {toast && (
        <div className="toast">
          <CheckCircle2 /><span>{toast}</span>
          <button onClick={() => setToast('')}><X /></button>
        </div>
      )}
    </div>
  );
}

function description(page: Page) {
  const descriptions: Record<Page, string> = {
    Overview: 'Your trading ecosystem at a glance.',
    'Live Trading': 'Monitor account snapshots and trading exposure.',
    'Market Intelligence': 'Technical context from the MASAPEP engine and connected market feeds.',
    'Signal Center': 'Review EA-generated signals without changing strategy rules.',
    Performance: 'Evaluate account snapshots and historical performance.',
    'Global Gold News': 'Gold, USD, central bank and macroeconomic event monitoring.',
    'EA Command Center': 'Monitor terminal instances and controlled EA actions.',
    'Telegram Center': 'Review notification delivery and integration health.',
    'System Settings': 'Manage secure connections, terminal instances and account preferences.'
  };

  return descriptions[page];
}

export default App;
