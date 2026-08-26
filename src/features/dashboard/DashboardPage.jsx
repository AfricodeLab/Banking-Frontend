import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Wallet, Landmark, ShieldCheck, Plus, ArrowRight, Banknote, PiggyBank,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CreditCard, Receipt, Building2,
  BarChart3, CircleDot, ChevronRight, LayoutGrid,
} from 'lucide-react';
import { useAsync } from '../../lib/useAsync.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { loadDashboard } from './dashboardData.js';
import { PageHeader, StatCard, Card, CardHeader, Button, StatusPill, MiniBars } from '../../components/ui/index.js';
import { formatMoney, formatNumber, relativeTime, initials } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const TXN_ICON = { deposit: ArrowDownLeft, withdrawal: ArrowUpRight, transfer: ArrowLeftRight };
const TXN_TONE = { deposit: 'success', withdrawal: 'danger', transfer: 'brand' };

const MODULES = [
  { to: '/customers', label: 'Customers', icon: Users, tone: 'brand' },
  { to: '/accounts', label: 'Accounts', icon: Wallet, tone: 'teal' },
  { to: '/teller', label: 'Teller', icon: Banknote, tone: 'success' },
  { to: '/loans', label: 'Loans', icon: Landmark, tone: 'brand' },
  { to: '/deposits', label: 'Deposits', icon: PiggyBank, tone: 'teal' },
  { to: '/payments', label: 'Payments', icon: ArrowLeftRight, tone: 'brand' },
  { to: '/cards', label: 'Cards', icon: CreditCard, tone: 'slate' },
  { to: '/reports', label: 'Reports', icon: BarChart3, tone: 'slate' },
];

const TILE_TONE = {
  brand: 'bg-brand-50 text-brand-600', teal: 'bg-teal-500/10 text-teal-600',
  success: 'bg-success-50 text-success-600', slate: 'bg-slate-100 text-slate-500',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading } = useAsync(() => loadDashboard(), []);

  const d = data || { customers: [], accounts: [], loans: [], txns: [], health: null };
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = user?.first_name || user?.username || 'there';

  const stats = useMemo(() => {
    const deposits = d.accounts.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
    const outstanding = d.loans.reduce((s, l) => s + (Number(l.remaining_balance) || 0), 0);
    const kycPending = d.customers.filter((c) => String(c.kyc_status).toLowerCase() !== 'verified').length;
    const activeLoans = d.loans.filter((l) => String(l.status).toLowerCase() === 'active').length;
    const primaryCcy = d.accounts[0]?.currency || 'USD';
    return { deposits, outstanding, kycPending, activeLoans, primaryCcy };
  }, [d]);

  const byType = useMemo(() => {
    const m = {};
    d.accounts.forEach((a) => { const k = a.account_type || 'other'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([label, value], i) => ({ label, value, tone: ['brand', 'teal', 'success', 'slate'][i % 4] }));
  }, [d]);

  const byCurrency = useMemo(() => {
    const m = {};
    d.accounts.forEach((a) => { const k = a.currency || 'USD'; m[k] = (m[k] || 0) + (parseFloat(a.balance) || 0); });
    return Object.entries(m).map(([label, value], i) => ({ label, value, display: formatNumber(value, { maximumFractionDigits: 0 }), tone: ['teal', 'brand', 'success', 'slate'][i % 4] }));
  }, [d]);

  const kycQueue = d.customers.filter((c) => String(c.kyc_status).toLowerCase() !== 'verified').slice(0, 5);
  const healthTone = ['healthy', 'up'].includes(d.health?.status) ? 'success' : d.health?.status === 'degraded' ? 'warning' : 'danger';

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${name}`}
        description="Here's what's happening across the bank today."
        actions={
          <>
            <Button variant="secondary" icon={Banknote} onClick={() => navigate('/teller')}>Teller</Button>
            <Button icon={Plus} onClick={() => navigate('/customers/new')}>New customer</Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total customers" value={loading ? '—' : formatNumber(d.customers.length)} icon={Users} accent="brand" footer={`${stats.kycPending} awaiting KYC`} />
        <StatCard label={`Deposits (${stats.primaryCcy})`} value={loading ? '—' : formatMoney(stats.deposits, stats.primaryCcy)} icon={Wallet} accent="teal" footer={`${d.accounts.length} accounts`} />
        <StatCard label="Loan book" value={loading ? '—' : formatMoney(stats.outstanding, 'GHS')} icon={Landmark} accent="brand" footer={`${stats.activeLoans} active loans`} />
        <StatCard label="KYC pending" value={loading ? '—' : stats.kycPending} icon={ShieldCheck} accent={stats.kycPending ? 'warning' : 'success'} footer="Verification queue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Portfolio at a glance" icon={BarChart3} subtitle="Live distribution across the book" />
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
              actions={<Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => navigate('/accounts')}>Accounts</Button>} />
            <div className="divide-y divide-slate-100">
              {loading && <div className="p-6 text-sm text-slate-400">Loading activity…</div>}
              {!loading && d.txns.length === 0 && <div className="p-6 text-sm text-slate-400">No transactions yet. Post one from the Teller.</div>}
              {d.txns.map((t) => {
                const Icon = TXN_ICON[t.transaction_type] || Receipt;
                const tone = TXN_TONE[t.transaction_type] || 'slate';
                return (
                  <div key={t.transaction_id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60">
                    <span className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', TILE_TONE[tone] || TILE_TONE.slate)}>
                      <Icon size={16} />
                    </span>
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

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="KYC & approvals" icon={ShieldCheck}
              actions={<Button variant="ghost" size="sm" onClick={() => navigate('/compliance')}>Queue</Button>} />
            <div className="divide-y divide-slate-100">
              {!loading && kycQueue.length === 0 && <div className="p-5 text-sm text-slate-400">All customers verified. 🎉</div>}
              {kycQueue.map((c) => (
                <button key={c.customer_id} onClick={() => navigate(`/customers/${c.customer_id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left">
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
              {MODULES.map((m) => (
                <button key={m.to} onClick={() => navigate(m.to)}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 hover:border-brand-300 hover:bg-brand-50/50 transition-colors text-left">
                  <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', TILE_TONE[m.tone])}><m.icon size={16} /></span>
                  <span className="text-sm font-medium text-slate-700 truncate">{m.label}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="System status" icon={CircleDot} />
            <div className="p-4 space-y-2.5 text-sm">
              <StatusRow label="Core banking API" tone={healthTone} value={d.health?.status || '—'} />
              <StatusRow label="Database" tone="success" value="postgres" />
              <StatusRow label="Branch" tone="success" value="Accra Main" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, tone }) {
  const dot = { success: 'bg-success-500', warning: 'bg-warning-500', danger: 'bg-danger-500' }[tone] || 'bg-slate-400';
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="inline-flex items-center gap-1.5 text-slate-700 capitalize">
        <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />{value}
      </span>
    </div>
  );
}
