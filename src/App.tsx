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
