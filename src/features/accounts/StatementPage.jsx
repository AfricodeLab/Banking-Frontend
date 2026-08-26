import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download, Landmark, CalendarRange } from 'lucide-react';
import { AccountApi, TransactionApi, CustomerApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { Button, Spinner } from '../../components/ui/index.js';
import { formatMoney, formatDate, formatDateTime } from '../../lib/format.js';
import { asList } from './accountsData.js';
import { buildStatement } from './statement.js';
import { cn } from '../../lib/cn.js';

const iso = (d) => d.toISOString().slice(0, 10);
function presets() {
  const now = new Date();
  const som = new Date(now.getFullYear(), now.getMonth(), 1);
  const ago = (n) => new Date(now.getTime() - n * 86400000);
  return [
    { key: 'month', label: 'This month', from: iso(som), to: iso(now) },
    { key: '30d', label: 'Last 30 days', from: iso(ago(30)), to: iso(now) },
    { key: '90d', label: 'Last 90 days', from: iso(ago(90)), to: iso(now) },
  ];
}

export function StatementPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const P = useMemo(presets, []);
  const [range, setRange] = useState({ from: P[0].from, to: P[0].to, preset: 'month' });

  const account = useAsync(() => AccountApi.get(id), [id]);
  const txns = useAsync(() => TransactionApi.byAccount(id, { limit: 1000 }).then(asList).catch(() => []), [id]);
  const a = account.data;
  const owner = useAsync(() => (a?.customer_id ? CustomerApi.get(a.customer_id).catch(() => null) : Promise.resolve(null)), [a?.customer_id]);

  const stmt = useMemo(() => (a ? buildStatement(a, txns.data || [], range.from, range.to) : null), [a, txns.data, range]);

  const exportCsv = () => {
    if (!stmt) return;
    const header = 'date,description,reference,debit,credit,balance';
    const lines = stmt.lines.map((l) => [
      String(l.transaction_date).slice(0, 10),
      `"${(l.description || l.transaction_type).replace(/"/g, "'")}"`,
      l.reference_number || '',
      l.signed < 0 ? (-l.signed).toFixed(2) : '',
      l.signed > 0 ? l.signed.toFixed(2) : '',
      l.balance.toFixed(2),
    ].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `statement_${(a.account_id || '').slice(0, 8)}_${range.from}_${range.to}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  if (account.loading || !a) {
    return <div className="flex items-center justify-center gap-2 py-24 text-slate-400"><Spinner size={20} /> Loading statement…</div>;
  }

  return (
    <div>
      {/* Controls (not printed) */}
      <div className="no-print">
        <button onClick={() => navigate(`/accounts/${id}`)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft size={15} /> Back to account
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {P.map((p) => (
              <button key={p.key} onClick={() => setRange({ from: p.from, to: p.to, preset: p.key })}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', range.preset === p.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 num text-sm">
            <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value, preset: '' }))} className="h-9 px-3 border border-slate-300 rounded-md focus:outline-none focus:border-brand-500" />
            <span className="text-slate-400">→</span>
            <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value, preset: '' }))} className="h-9 px-3 border border-slate-300 rounded-md focus:outline-none focus:border-brand-500" />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!stmt?.lines.length}>CSV</Button>
            <Button icon={Printer} onClick={() => window.print()}>Print</Button>
          </div>
        </div>
      </div>

      {/* Printable statement */}
      <div className="print-area card p-8 max-w-4xl mx-auto">
        {/* Letterhead */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 text-white"><Landmark size={22} /></span>
            <div>
              <div className="text-lg font-semibold text-slate-900">AfriCore</div>
              <div className="text-xs text-slate-500">AfricodeLab · Accra Main</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-semibold text-slate-800">Account Statement</div>
            <div className="text-xs text-slate-500 num">{formatDate(range.from)} — {formatDate(range.to)}</div>
            <div className="text-2xs text-slate-400 mt-0.5">Generated {formatDateTime(new Date())}</div>
          </div>
        </div>

        {/* Account details */}
        <div className="grid grid-cols-2 gap-4 py-5 text-sm">
          <div>
            <div className="text-2xs uppercase tracking-wide text-slate-400">Account holder</div>
            <div className="font-medium text-slate-800">{owner.data?.name || '—'}</div>
            {owner.data?.address && <div className="text-xs text-slate-500 mt-0.5">{owner.data.address}</div>}
          </div>
          <div className="text-right">
            <div className="text-2xs uppercase tracking-wide text-slate-400">Account</div>
            <div className="num text-slate-700">{a.account_id}</div>
            <div className="text-xs text-slate-500 capitalize">{a.account_type} · {a.currency}</div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Summary label="Opening balance" value={formatMoney(stmt.opening, a.currency)} />
          <Summary label="Total credits" value={formatMoney(stmt.credits, a.currency)} tone="success" />
          <Summary label="Total debits" value={formatMoney(stmt.debits, a.currency)} tone="danger" />
          <Summary label="Closing balance" value={formatMoney(stmt.closing, a.currency)} strong />
        </div>

        {/* Lines */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-y border-slate-200 text-2xs uppercase tracking-wide text-slate-500">
              <th className="text-left py-2 pr-2">Date</th>
              <th className="text-left py-2 px-2">Description</th>
              <th className="text-right py-2 px-2">Debit</th>
              <th className="text-right py-2 px-2">Credit</th>
              <th className="text-right py-2 pl-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 text-slate-500">
              <td className="py-2 pr-2" colSpan={4}>Opening balance</td>
              <td className="py-2 pl-2 text-right num">{formatMoney(stmt.opening, a.currency)}</td>
            </tr>
            {txns.loading ? (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">Loading transactions…</td></tr>
            ) : stmt.lines.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">No transactions in this period.</td></tr>
            ) : stmt.lines.map((l) => (
              <tr key={l.transaction_id} className="border-b border-slate-50">
                <td className="py-2 pr-2 num text-xs text-slate-500 whitespace-nowrap">{formatDate(l.transaction_date)}</td>
                <td className="py-2 px-2 text-slate-700">
                  <div className="capitalize">{l.description || l.transaction_type}</div>
                  <div className="num text-2xs text-slate-400">{l.reference_number}</div>
                </td>
                <td className="py-2 px-2 text-right num text-danger-600">{l.signed < 0 ? formatMoney(-l.signed, a.currency) : ''}</td>
                <td className="py-2 px-2 text-right num text-success-700">{l.signed > 0 ? formatMoney(l.signed, a.currency) : ''}</td>
                <td className="py-2 pl-2 text-right num font-medium text-slate-800">{formatMoney(l.balance, a.currency)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 font-semibold text-slate-800">
              <td className="py-2 pr-2" colSpan={4}>Closing balance</td>
              <td className="py-2 pl-2 text-right num">{formatMoney(stmt.closing, a.currency)}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-2xs text-slate-400 mt-5 pt-4 border-t border-slate-100">
          This statement is computer-generated. Balances are shown in {a.currency}. For queries contact your branch.
        </p>
      </div>
    </div>
  );
}

function Summary({ label, value, tone, strong }) {
  return (
    <div className={cn('rounded-lg border border-slate-200 p-3', strong && 'bg-slate-50')}>
      <div className="text-2xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cn('num font-semibold mt-0.5', strong ? 'text-slate-900 text-base' : 'text-sm text-slate-800', tone === 'success' && 'text-success-700', tone === 'danger' && 'text-danger-600')}>{value}</div>
    </div>
  );
}
