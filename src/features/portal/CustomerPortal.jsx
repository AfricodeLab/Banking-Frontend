import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark, LogOut, Wallet, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Receipt, PiggyBank,
} from 'lucide-react';
import { PortalApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { DataTable, StatusPill, Spinner } from '../../components/ui/index.js';
import { formatMoney, formatDateTime } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const TYPE_ICON = { deposit: ArrowDownLeft, withdrawal: ArrowUpRight, transfer: ArrowLeftRight };

export function CustomerPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profile = useAsync(() => PortalApi.profile().catch(() => null), []);
  const accountsQ = useAsync(() => PortalApi.accounts().then((r) => r.accounts || []), []);
  const txnsQ = useAsync(() => PortalApi.transactions().then((r) => r.transactions || []), []);

  const accounts = accountsQ.data || [];
  const ownIds = useMemo(() => new Set(accounts.map((a) => a.account_id)), [accounts]);

  // Group total by currency (accounts may be multi-currency).
  const totals = useMemo(() => {
    const m = {};
    accounts.forEach((a) => { const c = a.currency || 'GHS'; m[c] = (m[c] || 0) + Number(a.balance || 0); });
    return m;
  }, [accounts]);

  const name = profile.data?.name || user?.first_name || user?.username || 'there';
  const firstName = String(name).split(' ')[0];

  const columns = [
    {
      key: 'transaction_type', header: 'Type', width: '150px',
      render: (t) => {
        const Icon = TYPE_ICON[t.transaction_type] || Receipt;
        return <span className="inline-flex items-center gap-2 capitalize font-medium text-slate-700"><Icon size={15} className="text-slate-400" />{t.transaction_type}</span>;
      },
    },
    { key: 'description', header: 'Details', render: (t) => <span className="text-slate-600">{t.description || t.reference_number || '—'}</span> },
    { key: 'transaction_date', header: 'Date', render: (t) => <span className="text-slate-500 text-xs">{formatDateTime(t.transaction_date)}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusPill status={t.status} /> },
    {
      key: 'amount', header: 'Amount', align: 'right',
      render: (t) => {
        const incoming = t.to_account_id && ownIds.has(t.to_account_id);
        return (
          <span className={cn('num font-semibold', incoming ? 'text-success-600' : 'text-slate-800')}>
            {incoming ? '+' : '−'}{formatMoney(t.amount, t.currency).replace(/^[^\d]*/, (m) => m)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Portal header */}
      <header className="h-16 bg-navy-900 text-white flex items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-teal-500 shadow-sm"><Landmark size={19} /></span>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">AfriCore</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Online Banking</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-sm text-slate-300">{name}</span>
          <button onClick={() => { logout(); navigate('/login'); }} className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome back, {firstName}</h1>
        <p className="text-sm text-slate-500 mt-1">Here's an overview of your accounts.</p>

        {/* Totals */}
        <div className="mt-6 flex flex-wrap gap-3">
          {Object.entries(totals).map(([ccy, total]) => (
            <div key={ccy} className="rounded-xl bg-navy-900 text-white px-5 py-4 min-w-[200px]">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Total balance · {ccy}</div>
              <div className="num text-2xl font-semibold mt-1">{formatMoney(total, ccy)}</div>
            </div>
          ))}
          {accountsQ.loading && <div className="flex items-center gap-2 text-slate-400 text-sm py-4"><Spinner size={16} /> Loading…</div>}
        </div>

        {/* Accounts */}
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mt-8 mb-3">Your accounts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => {
            const Icon = a.account_type === 'savings' ? PiggyBank : Wallet;
            return (
              <div key={a.account_id} className="rounded-xl bg-white border border-slate-200 p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-600"><Icon size={18} /></span>
                  <StatusPill status={a.status} />
                </div>
                <div className="mt-3 text-xs text-slate-400 capitalize">{a.account_type} account</div>
                <div className="num text-xl font-semibold text-slate-900 mt-0.5">{formatMoney(a.balance, a.currency)}</div>
                <div className="num text-xs text-slate-400 mt-1">{a.account_number || a.account_id.slice(0, 12)}</div>
              </div>
            );
          })}
          {!accountsQ.loading && accounts.length === 0 && (
            <div className="col-span-full text-sm text-slate-400 py-6 text-center">No accounts yet.</div>
          )}
        </div>

        {/* Transactions */}
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mt-8 mb-3">Recent activity</h2>
        <div className="rounded-xl bg-white border border-slate-200 shadow-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={txnsQ.loading ? null : (txnsQ.data || [])}
            loading={txnsQ.loading}
            error={txnsQ.error}
            rowKey={(t) => t.transaction_id}
            pageSize={10}
            empty={{ icon: Receipt, title: 'No transactions yet', description: 'Your account activity will appear here.' }}
          />
        </div>

        <p className="text-xs text-slate-400 mt-6 text-center">Need help? Contact your branch. © {new Date().getFullYear()} AfricodeLab · AfriCore</p>
      </main>
    </div>
  );
}
