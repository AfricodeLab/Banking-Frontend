import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Wallet, Landmark, ShieldCheck, Plus, ArrowRight, Banknote, PiggyBank,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CreditCard, Receipt, BarChart3,
  CircleDot, LayoutGrid, Repeat, Activity, TrendingUp,
} from 'lucide-react';
import { useAsync } from '../../lib/useAsync.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { loadDashboard } from './dashboardData.js';
import { PageHeader, StatCard, Card, CardHeader, Button, StatusPill, MiniBars, BarChart } from '../../components/ui/index.js';
import { formatMoney, formatNumber, formatDate, relativeTime, initials } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const TXN_ICON = { deposit: ArrowDownLeft, withdrawal: ArrowUpRight, transfer: ArrowLeftRight };
const TILE_TONE = {
  brand: 'bg-brand-50 text-brand-600', teal: 'bg-teal-500/10 text-teal-600',
  success: 'bg-success-50 text-success-600', danger: 'bg-danger-50 text-danger-600', slate: 'bg-slate-100 text-slate-500',
};
const MODULES = [
  { to: '/customers', label: 'Customers', icon: Users, tone: 'brand' },
  { to: '/accounts', label: 'Accounts', icon: Wallet, tone: 'teal' },
  { to: '/teller', label: 'Teller', icon: Banknote, tone: 'success' },
  { to: '/payments', label: 'Payments', icon: ArrowLeftRight, tone: 'brand' },
  { to: '/loans', label: 'Loans', icon: Landmark, tone: 'brand' },
  { to: '/cards', label: 'Cards', icon: CreditCard, tone: 'slate' },
  { to: '/compliance', label: 'KYC / AML', icon: ShieldCheck, tone: 'teal' },
  { to: '/reports', label: 'Reports', icon: BarChart3, tone: 'slate' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading } = useAsync(() => loadDashboard(), []);
  const d = data || { customers: [], accounts: [], loans: [], txns: [], daily: [], standingOrders: [], health: null, txStats: null, cardStats: null };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = user?.first_name || user?.username || 'there';

  const m = useMemo(() => {
    const deposits = d.accounts.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
    const outstanding = d.loans.reduce((s, l) => s + (Number(l.remaining_balance) || 0), 0);
    const kycPending = d.customers.filter((c) => String(c.kyc_status).toLowerCase() !== 'verified').length;
    const activeLoans = d.loans.filter((l) => String(l.status).toLowerCase() === 'active').length;
    const activeSO = d.standingOrders.filter((o) => String(o.status).toLowerCase() === 'active').length;
    const value14 = (d.daily || []).reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
    const primaryCcy = d.accounts[0]?.currency || 'GHS';
    const highRisk = d.customers.filter((c) => ['high', 'critical'].includes(String(c.risk_rating).toLowerCase())).length;
    return { deposits, outstanding, kycPending, activeLoans, activeSO, value14, primaryCcy, highRisk };
  }, [d]);

  const byType = useMemo(() => {
    const map = {};
    d.accounts.forEach((a) => { const k = a.account_type || 'other'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([label, value], i) => ({ label, value, tone: ['brand', 'teal', 'success', 'slate'][i % 4] }));
  }, [d]);
  const byCurrency = useMemo(() => {
    const map = {};
    d.accounts.forEach((a) => { const k = a.currency || 'GHS'; map[k] = (map[k] || 0) + (parseFloat(a.balance) || 0); });
    return Object.entries(map).map(([label, value], i) => ({ label, value, display: formatNumber(value, { maximumFractionDigits: 0 }), tone: ['teal', 'brand', 'success', 'slate'][i % 4] }));
  }, [d]);
  const chartData = (d.daily || []).map((x) => ({ label: formatDate(x.date, { month: 'short', day: 'numeric' }), value: parseFloat(x.total_amount || 0) }));

  const kycQueue = d.customers.filter((c) => String(c.kyc_status).toLowerCase() !== 'verified').slice(0, 5);
  const healthTone = ['healthy', 'up'].includes(d.health?.status) ? 'success' : d.health?.status === 'degraded' ? 'warning' : 'danger';

  return (
    <div>
      <PageHeader title={`${greeting}, ${name}`} description="Bank-wide operational overview"
        actions={<>
          <Button variant="secondary" icon={Banknote} onClick={() => navigate('/teller')}>Teller</Button>
          <Button icon={Plus} onClick={() => navigate('/customers/new')}>New customer</Button>
        </>} />

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total customers" value={loading ? '—' : formatNumber(d.customers.length)} icon={Users} accent="brand" footer={`${m.kycPending} awaiting KYC`} />
        <StatCard label={`Deposits (${m.primaryCcy})`} value={loading ? '—' : formatMoney(m.deposits, m.primaryCcy)} icon={Wallet} accent="teal" footer={`${d.accounts.length} accounts`} />
        <StatCard label="Loan book" value={loading ? '—' : formatMoney(m.outstanding, 'GHS')} icon={Landmark} accent="brand" footer={`${m.activeLoans} active loans`} />
        <StatCard label="KYC pending" value={loading ? '—' : m.kycPending} icon={ShieldCheck} accent={m.kycPending ? 'warning' : 'success'} footer={`${m.highRisk} high-risk`} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="Transactions today" value={loading ? '—' : (d.txStats?.today_transactions ?? 0)} icon={Receipt} accent="success" footer={`${d.txStats?.month_transactions ?? 0} this month`} />
        <StatCard label="Volume (14 days)" value={loading ? '—' : formatMoney(m.value14, 'GHS')} icon={TrendingUp} accent="teal" footer="Posted value" />
        <StatCard label="Cards issued" value={loading ? '—' : ((d.cardStats?.active_cards ?? 0) + (d.cardStats?.blocked_cards ?? 0))} icon={CreditCard} accent="brand" footer={`${d.cardStats?.active_cards ?? 0} active`} />
        <StatCard label="Standing orders" value={loading ? '—' : m.activeSO} icon={Repeat} accent="slate" footer="Recurring, active" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Transaction volume" icon={BarChart3} subtitle="Posted value over the last 14 days" />
            <div className="p-4">
              {loading ? <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
                : <BarChart data={chartData} formatValue={(v) => formatMoney(v, 'GHS')} tone="brand" />}
            </div>
          </Card>

          <Card>
            <CardHeader title="Portfolio at a glance" icon={Wallet} subtitle="Live distribution across the book" />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-3">Accounts by product</div>
                <MiniBars items={byType} />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 mb-3">Deposits by currency</div>
                <MiniBars items={byCurrency} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent activity" icon={Receipt}
              actions={<Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => navigate('/transactions')}>Register</Button>} />
            <div className="divide-y divide-slate-100">
              {loading && <div className="p-6 text-sm text-slate-400">Loading activity…</div>}
              {!loading && d.txns.length === 0 && <div className="p-6 text-sm text-slate-400">No transactions yet.</div>}
              {d.txns.map((t) => {
                const Icon = TXN_ICON[t.transaction_type] || Receipt;
                const tone = t.transaction_type === 'deposit' ? 'success' : t.transaction_type === 'withdrawal' ? 'danger' : 'brand';
                return (
                  <div key={t.transaction_id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60">
                    <span className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', TILE_TONE[tone])}><Icon size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 capitalize truncate">{t.transaction_type} · {t.party || '—'}</div>
                      <div className="text-xs text-slate-400 truncate">{t.description || t.reference_number}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="num text-sm font-semibold text-slate-800">{formatMoney(t.amount, t.currency)}</div>
                      <div className="text-2xs text-slate-400">{relativeTime(t.transaction_date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Loan book" icon={Landmark} actions={<Button variant="ghost" size="sm" onClick={() => navigate('/loans')}>Open</Button>} />
            <div className="p-4 space-y-2.5 text-sm">
              <Row label="Outstanding" value={<span className="num font-medium">{formatMoney(m.outstanding, 'GHS')}</span>} />
              <Row label="Active loans" value={<span className="num">{m.activeLoans}</span>} />
              <Row label="Total loans" value={<span className="num">{d.loans.length}</span>} />
              <Row label="Disbursed" value={<span className="num">{formatMoney(d.loans.reduce((s, l) => s + (Number(l.principal_amount) || 0), 0), 'GHS')}</span>} />
            </div>
          </Card>

          <Card>
            <CardHeader title="KYC & approvals" icon={ShieldCheck} actions={<Button variant="ghost" size="sm" onClick={() => navigate('/compliance')}>Queue</Button>} />
            <div className="divide-y divide-slate-100">
              {!loading && kycQueue.length === 0 && <div className="p-5 text-sm text-slate-400">All customers verified. 🎉</div>}
              {kycQueue.map((c) => (
                <button key={c.customer_id} onClick={() => navigate(`/customers/${c.customer_id}`)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 text-xs font-semibold shrink-0">{initials(c.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                    <div className="text-xs text-slate-400 truncate">{c.email}</div>
                  </div>
                  <StatusPill status={c.kyc_status || 'pending'} />
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Quick access" icon={LayoutGrid} />
            <div className="p-3 grid grid-cols-2 gap-2">
              {MODULES.map((mo) => (
                <button key={mo.to} onClick={() => navigate(mo.to)} className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 hover:border-brand-300 hover:bg-brand-50 transition-colors text-left">
                  <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', TILE_TONE[mo.tone])}><mo.icon size={16} /></span>
                  <span className="text-sm font-medium text-slate-700 truncate">{mo.label}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="System status" icon={CircleDot} />
            <div className="p-4 space-y-2.5 text-sm">
              <StatusRow label="Core banking API" tone={healthTone} value={d.health?.status || '—'} />
              <StatusRow label="Database" tone="success" value="postgres" />
              <StatusRow label="Scheduler" tone="success" value="running" />
              <StatusRow label="Branch" tone="success" value="Accra Main" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{label}</span><span className="text-slate-800">{value}</span></div>;
}
function StatusRow({ label, value, tone }) {
  const dot = { success: 'bg-success-500', warning: 'bg-warning-500', danger: 'bg-danger-500' }[tone] || 'bg-slate-400';
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-slate-700 capitalize"><span className={cn('w-1.5 h-1.5 rounded-full', dot)} />{value}</span>
    </div>
  );
}
