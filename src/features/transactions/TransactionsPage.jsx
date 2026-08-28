import React, { useMemo, useState } from 'react';
import {
  Receipt, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CheckCircle2,
  Clock, XCircle, ScrollText, ShieldAlert, Bot, ShieldCheck,
} from 'lucide-react';
import { TransactionApi, RiskApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { loadAllTransactions, partyLabel } from './transactionsData.js';
import { asList } from '../accounts/accountsData.js';
import {
  PageHeader, Card, DataTable, StatusPill, Button, Input, StatCard, Modal, Spinner, Field, useToast, useConfirm,
  Toolbar, ToolbarRow, ToolbarSpacer, ToolbarFilters, SearchInput, SegmentedControl, FilterSelect, DateRangeFilter, ResultCount,
} from '../../components/ui/index.js';
import { RotateCcw } from 'lucide-react';
import { formatMoney, formatDateTime, formatDate } from '../../lib/format.js';
import { Can } from '../../lib/auth/Can.jsx';
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

  const activeFilters = (status !== 'all' ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  const clearFilters = () => { setStatus('all'); setFrom(''); setTo(''); };

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
        <Toolbar>
          <ToolbarRow>
            <SegmentedControl options={TYPES} value={type} onChange={setType} />
            <ToolbarSpacer />
            <ResultCount shown={rows.length} total={txns.length} noun="transactions" loading={loading} />
            <SearchInput value={q} onChange={setQ} placeholder="Search ref, name, amount…" />
          </ToolbarRow>
          <ToolbarFilters active={activeFilters} onClear={clearFilters}>
            <FilterSelect label="Status" value={status} onChange={setStatus}
              options={['all', 'completed', 'pending', 'failed', 'cancelled'].map((s) => ({ value: s, label: s === 'all' ? 'All statuses' : s }))} />
            <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
          </ToolbarFilters>
        </Toolbar>
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
  const alert = useAsync(() => (txn ? RiskApi.byTransaction(txn.transaction_id).then((r) => r?.alert ?? null).catch(() => null) : Promise.resolve(null)), [txn?.transaction_id]);
  if (!txn) return null;
  const Icon = TYPE_ICON[txn.transaction_type] || Receipt;
  const canReverse = String(txn.status).toLowerCase() === 'completed';

  const doReverse = async () => {
    const ok = await confirm({
      title: 'Reverse transaction?',
      message: `Submit a reversal of ${formatMoney(txn.amount, txn.currency)} (${txn.transaction_type}) for approval. A second officer must approve before the contra entry posts and the original is marked reversed.`,
      confirmLabel: 'Submit for approval',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await TransactionApi.reverse(txn.transaction_id, reason || 'correction');
      toast.success('Reversal submitted for approval');
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

        <RiskAssessmentPanel loading={alert.loading} alert={alert.data} />

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

        {/* Reversal — only shown to users who may cancel/adjust transactions */}
        {canReverse ? (
          <Can permission="cancel_transaction">
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
          </Can>
        ) : String(txn.status).toLowerCase() === 'reversed' ? (
          <div className="border-t border-slate-100 pt-4 text-sm text-slate-500">This transaction has been reversed.</div>
        ) : null}
      </div>
    </Modal>
  );
}

const DEC_TONE = {
  BLOCK:  { wrap: 'bg-danger-50 border-danger-200', chip: 'bg-danger-100 text-danger-700', text: 'text-danger-700', icon: ShieldAlert, label: 'Blocked by fraud AI' },
  REVIEW: { wrap: 'bg-warning-50 border-warning-200', chip: 'bg-warning-100 text-warning-700', text: 'text-warning-700', icon: ShieldAlert, label: 'Flagged for review' },
  ALLOW:  { wrap: 'bg-success-50 border-success-200', chip: 'bg-success-100 text-success-700', text: 'text-success-700', icon: ShieldCheck, label: 'Cleared' },
};

// Shows why the fraud AI (Sentinel) flagged or blocked this transaction. Renders
// nothing for clean transactions; loud and unmissable when a decision was made.
function RiskAssessmentPanel({ loading, alert }) {
  if (loading) {
    return (
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm"><Spinner size={14} /> Checking fraud assessment…</div>
      </div>
    );
  }
  if (!alert) return null;

  const decision = String(alert.decision || (alert.severity === 'high' ? 'BLOCK' : 'REVIEW')).toUpperCase();
  const tone = DEC_TONE[decision] || DEC_TONE.REVIEW;
  const Icon = tone.icon;
  const score = typeof alert.score === 'number' ? alert.score : Number(alert.score || 0);
  const explanation = alert.explanation || alert.reasons || 'No explanation was recorded for this alert.';
  const signals = String(alert.reasons || '').split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <div className={cn('rounded-xl border p-4', tone.wrap)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn('flex items-center justify-center w-9 h-9 rounded-lg', tone.chip)}><Icon size={18} /></span>
          <div>
            <div className={cn('text-sm font-semibold', tone.text)}>{tone.label}</div>
            <div className="text-2xs uppercase tracking-wide text-slate-500">
              Fraud assessment · source {alert.source || 'rules'}{alert.status ? ` · ${alert.status}` : ''}
            </div>
          </div>
        </div>
        {score > 0 && (
          <div className="text-right">
            <div className={cn('num text-xl font-semibold leading-none', tone.text)}>{Math.round(score * 100)}</div>
            <div className="text-2xs uppercase tracking-wide text-slate-500">risk score</div>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-lg bg-white/70 border border-white/60 p-3">
        <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wide text-slate-500 mb-1"><Bot size={13} /> AI analyst explanation</div>
        <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>
      </div>

      {signals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {signals.map((s, i) => (
            <span key={i} className="px-2 py-0.5 text-2xs font-medium rounded-md bg-white/70 text-slate-600 border border-white/60">{s}</span>
          ))}
        </div>
      )}
    </div>
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
