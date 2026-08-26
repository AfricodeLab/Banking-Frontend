import React, { useMemo, useState } from 'react';
import {
  Receipt, Search, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CheckCircle2,
  Clock, XCircle, ScrollText,
} from 'lucide-react';
import { TransactionApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { loadAllTransactions, partyLabel } from './transactionsData.js';
import { asList } from '../accounts/accountsData.js';
import { PageHeader, Card, DataTable, StatusPill, Button, Input, Select, StatCard, Modal, Spinner, Field, useToast, useConfirm } from '../../components/ui/index.js';
import { RotateCcw } from 'lucide-react';
import { formatMoney, formatDateTime, formatDate } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const TYPE_ICON = { deposit: ArrowDownLeft, withdrawal: ArrowUpRight, transfer: ArrowLeftRight };
const TYPE_TONE = { deposit: 'bg-success-50 text-success-600', withdrawal: 'bg-danger-50 text-danger-600', transfer: 'bg-brand-50 text-brand-600' };
const TYPES = ['all', 'deposit', 'withdrawal', 'transfer'];

export function TransactionsPage() {
  const { data, loading, error, reload } = useAsync(() => loadAllTransactions(), []);
  const stats = useAsync(() => TransactionApi.stats().catch(() => null), []);
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState(null);

  const txns = data || [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return txns.filter((t) => {
      if (type !== 'all' && t.transaction_type !== type) return false;
      if (status !== 'all' && String(t.status).toLowerCase() !== status) return false;
      if (from && new Date(t.transaction_date) < new Date(from)) return false;
      if (to && new Date(t.transaction_date) > new Date(to + 'T23:59:59')) return false;
      if (term && ![t.reference_number, t.description, t.from_name, t.to_name, t.amount].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))) return false;
      return true;
    });
  }, [txns, type, status, q, from, to]);

  const columns = [
    {
      key: 'transaction_type', header: 'Type', width: '150px',
      render: (t) => {
        const Icon = TYPE_ICON[t.transaction_type] || Receipt;
        return (
          <div className="flex items-center gap-2">
            <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg shrink-0', TYPE_TONE[t.transaction_type] || 'bg-slate-100 text-slate-500')}><Icon size={14} /></span>
            <span className="capitalize font-medium text-slate-700">{t.transaction_type}</span>
          </div>
        );
      },
    },
    { key: 'party', header: 'Counterparty', render: (t) => <span className="text-slate-700">{partyLabel(t)}</span> },
    { key: 'reference_number', header: 'Reference', className: 'num text-xs text-slate-400', render: (t) => t.reference_number || '—' },
    { key: 'transaction_date', header: 'Date', render: (t) => <span className="text-slate-500">{formatDateTime(t.transaction_date)}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusPill status={t.status} /> },
    { key: 'amount', header: 'Amount', align: 'right', className: 'num font-semibold text-slate-800', render: (t) => formatMoney(t.amount, t.currency) },
  ];

  return (
    <div>
      <PageHeader title="Transactions" description="Bank-wide transaction register" />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="Completed" value={stats.data?.completed_transactions ?? (loading ? '—' : txns.filter((t) => t.status === 'completed').length)} icon={CheckCircle2} accent="success" />
        <StatCard label="Pending" value={stats.data?.pending_transactions ?? 0} icon={Clock} accent="warning" />
        <StatCard label="Failed" value={stats.data?.failed_transactions ?? 0} icon={XCircle} accent="danger" />
        <StatCard label="Today" value={stats.data?.today_transactions ?? '—'} icon={Receipt} accent="brand" />
      </div>

      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors', type === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap lg:ml-auto">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto h-9">
              {['all', 'completed', 'pending', 'failed', 'cancelled'].map((s) => <option key={s} value={s} className="capitalize">{s === 'all' ? 'All statuses' : s}</option>)}
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" title="From date" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" title="To date" />
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, name, amount…" className="pl-9 w-56" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-400 border-b border-slate-100">
          <span>{loading ? 'Loading…' : `${rows.length} of ${txns.length} transactions`}</span>
        </div>
        <DataTable columns={columns} rows={loading ? null : rows} loading={loading} error={error}
          onRowClick={(t) => setSelected(t)} rowKey={(t) => t.transaction_id}
          empty={{ icon: Receipt, title: 'No transactions', description: 'Adjust filters or post transactions from the Teller.' }} />
      </Card>

      <TransactionDetailModal txn={selected} onClose={() => setSelected(null)} onReversed={() => { setSelected(null); reload(); }} />
    </div>
  );
}

function TransactionDetailModal({ txn, onClose, onReversed }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const logs = useAsync(() => (txn ? TransactionApi.logs(txn.transaction_id).then(asList).catch(() => []) : Promise.resolve([])), [txn?.transaction_id]);
  if (!txn) return null;
  const Icon = TYPE_ICON[txn.transaction_type] || Receipt;
  const canReverse = String(txn.status).toLowerCase() === 'completed';

  const doReverse = async () => {
    const ok = await confirm({
      title: 'Reverse transaction?',
      message: `Post a contra entry that undoes ${formatMoney(txn.amount, txn.currency)} (${txn.transaction_type}) and marks the original as reversed. This cannot be undone.`,
      confirmLabel: 'Reverse',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await TransactionApi.reverse(txn.transaction_id, reason || 'correction');
      toast.success('Transaction reversed');
      onReversed?.();
    } catch (err) { toast.error(err?.message || 'Reversal failed'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={!!txn} onClose={onClose} title="Transaction detail" subtitle={txn.reference_number} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className={cn('flex items-center justify-center w-12 h-12 rounded-xl', TYPE_TONE[txn.transaction_type] || 'bg-slate-100 text-slate-500')}><Icon size={22} /></span>
          <div>
            <div className="num text-2xl font-semibold text-slate-900">{formatMoney(txn.amount, txn.currency)}</div>
            <div className="flex items-center gap-2"><span className="capitalize text-sm text-slate-600">{txn.transaction_type}</span><StatusPill status={txn.status} /></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm border-t border-slate-100 pt-4">
          <Detail label="Counterparty" value={partyLabel(txn)} />
          <Detail label="Reference" value={txn.reference_number} mono />
          <Detail label="Date" value={formatDateTime(txn.transaction_date)} />
          <Detail label="Currency" value={txn.currency} />
          <Detail label="Fee" value={formatMoney(txn.fee || 0, txn.currency)} mono />
          <Detail label="Description" value={txn.description} />
          {txn.from_account_id && <Detail label="From account" value={txn.from_account_id.slice(0, 16)} mono />}
          {txn.to_account_id && <Detail label="To account" value={txn.to_account_id.slice(0, 16)} mono />}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2"><ScrollText size={15} className="text-slate-400" /> Audit trail</div>
          {logs.loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-2"><Spinner size={14} /> Loading…</div>
          ) : (logs.data || []).length === 0 ? (
            <p className="text-sm text-slate-400">No log entries.</p>
          ) : (
            <ul className="space-y-2">
              {(logs.data || []).map((l) => (
                <li key={l.log_id} className="flex items-start gap-2.5 text-sm">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-50 text-brand-600 shrink-0 mt-0.5"><CheckCircle2 size={13} /></span>
                  <div>
                    <div className="text-slate-700 font-medium capitalize">{String(l.action || '').toLowerCase()}</div>
                    <div className="text-xs text-slate-400">{l.details} · {formatDateTime(l.performed_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reversal */}
        {canReverse ? (
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2"><RotateCcw size={15} className="text-slate-400" /> Reverse / adjust</div>
            <div className="flex items-end gap-2">
              <Field label="Reason" className="flex-1">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. duplicate posting, error correction" />
              </Field>
              <Button variant="danger" icon={RotateCcw} loading={busy} onClick={doReverse}>Reverse</Button>
            </div>
            <p className="text-2xs text-slate-400 mt-1.5">Posts a contra entry and marks this transaction as reversed. Recorded in the audit trail.</p>
          </div>
        ) : String(txn.status).toLowerCase() === 'reversed' ? (
          <div className="border-t border-slate-100 pt-4 text-sm text-slate-500">This transaction has been reversed.</div>
        ) : null}
      </div>
    </Modal>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cn('text-slate-700 mt-0.5', mono && 'num', !value && 'text-slate-300')}>{value || '—'}</div>
    </div>
  );
}
