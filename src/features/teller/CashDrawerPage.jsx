import React, { useState } from 'react';
import {
  Coins, Vault, LockKeyhole, PlayCircle, ArrowDownLeft, ArrowUpRight, Scale, AlertTriangle,
  Building2, RefreshCw, Wallet,
} from 'lucide-react';
import { TellerApi, BranchApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { asList } from '../accounts/accountsData.js';
import {
  PageHeader, Card, CardHeader, Button, Field, Input, Select, Badge, DataTable, Spinner,
  Modal, useToast, useConfirm,
} from '../../components/ui/index.js';
import { formatMoney, formatDateTime } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const MOVEMENT_META = {
  deposit_in: { label: 'Deposit in', icon: ArrowDownLeft, sign: '+', tone: 'text-success-600' },
  withdrawal_out: { label: 'Withdrawal out', icon: ArrowUpRight, sign: '−', tone: 'text-danger-600' },
  vault_in: { label: 'Vault in', icon: Vault, sign: '+', tone: 'text-success-600' },
  vault_out: { label: 'Vault out', icon: Vault, sign: '−', tone: 'text-danger-600' },
  adjustment: { label: 'Adjustment', icon: Scale, sign: '±', tone: 'text-slate-600' },
};

export function CashDrawerPage() {
  const sessionQ = useAsync(() => TellerApi.current().then((r) => r.session), []);
  const session = sessionQ.data;

  return (
    <div>
      <PageHeader title="Cash Drawer" description="Start-of-day, cash position, vault movements and end-of-day reconciliation" />
      {sessionQ.loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-16 justify-center"><Spinner size={18} /> Loading…</div>
      ) : session ? (
        <OpenDrawer summary={session} onChanged={() => sessionQ.reload()} />
      ) : (
        <OpenSessionCard onOpened={() => sessionQ.reload()} />
      )}
    </div>
  );
}

function OpenSessionCard({ onOpened }) {
  const toast = useToast();
  const branches = useAsync(() => BranchApi.list().then(asList).catch(() => []), []);
  const [branchId, setBranchId] = useState('');
  const [opening, setOpening] = useState('');
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (!branchId) return toast.error('Select your branch');
    const amt = parseFloat(opening || '0');
    if (Number.isNaN(amt) || amt < 0) return toast.error('Enter a valid opening cash amount');
    setBusy(true);
    try {
      await TellerApi.open({ branch_id: branchId, opening_cash: String(amt.toFixed(2)) });
      toast.success('Session opened', { title: `Opening cash ${formatMoney(amt, 'GHS')}` });
      onOpened?.();
    } catch (err) { toast.error(err?.message || 'Could not open session'); }
    finally { setBusy(false); }
  };

  return (
    <Card className="max-w-xl">
      <CardHeader title="Start of day" icon={PlayCircle} subtitle="Open your teller session to begin handling cash" />
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-2.5 text-sm text-brand-800 bg-brand-50 border border-brand-200 rounded-md px-3 py-2.5">
          <Coins size={16} className="mt-0.5 shrink-0 text-brand-600" />
          You can't accept deposits or pay withdrawals until a session is open. Count your drawer and confirm the opening cash.
        </div>
        <Field label="Branch" required>
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Select branch…</option>
            {(branches.data || []).map((b) => <option key={b.branch_id} value={b.branch_id}>{b.location || b.branch_id.slice(0, 8)}</option>)}
          </Select>
        </Field>
        <Field label="Opening cash (GHS)" required>
          <Input type="number" step="0.01" min="0" value={opening} onChange={(e) => setOpening(e.target.value)} mono placeholder="0.00" />
        </Field>
        <Button icon={PlayCircle} loading={busy} onClick={open} className="w-full">Open session</Button>
      </div>
    </Card>
  );
}

function OpenDrawer({ summary, onChanged }) {
  const s = summary.session;
  const movementsQ = useAsync(() => TellerApi.movements().then((r) => r.movements || []), []);
  const [closing, setClosing] = useState(false);

  const reload = () => { onChanged?.(); movementsQ.reload(); };

  return (
    <div className="space-y-5">
      {/* Position */}
      <Card>
        <CardHeader
          title="Cash position" icon={Wallet}
          subtitle={`Open since ${formatDateTime(s.opened_at)}`}
          actions={<Badge tone="success">session open</Badge>}
        />
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Tile label="Opening" value={s.opening_cash} />
          <Tile label="Deposits in" value={summary.deposits} tone="success" sign="+" />
          <Tile label="Withdrawals out" value={summary.withdrawals} tone="danger" sign="−" />
          <Tile label="Vault in" value={summary.vault_in} tone="success" sign="+" />
          <Tile label="Vault out" value={summary.vault_out} tone="danger" sign="−" />
          <Tile label="Expected cash" value={summary.expected_cash} strong />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* Journal */}
        <Card>
          <CardHeader title="Cash journal" icon={Coins} subtitle="This session's movements"
            actions={<Button size="sm" variant="ghost" icon={RefreshCw} onClick={reload}>Refresh</Button>} />
          <DataTable
            columns={[
              { key: 'type', header: 'Type', render: (m) => {
                const meta = MOVEMENT_META[m.type] || { label: m.type, icon: Coins };
                const Icon = meta.icon;
                return <span className="inline-flex items-center gap-1.5 text-slate-700"><Icon size={14} className="text-slate-400" />{meta.label}</span>;
              } },
              { key: 'note', header: 'Note', render: (m) => <span className="text-slate-500 text-xs">{m.note || (m.linked_transaction_id ? 'linked txn' : '—')}</span> },
              { key: 'created_at', header: 'Time', render: (m) => <span className="text-slate-500 text-xs">{formatDateTime(m.created_at)}</span> },
              { key: 'amount', header: 'Amount', align: 'right', render: (m) => {
                const meta = MOVEMENT_META[m.type] || {};
                return <span className={cn('num font-semibold', meta.tone)}>{meta.sign}{formatMoney(m.amount, 'GHS')}</span>;
              } },
            ]}
            rows={movementsQ.loading ? null : (movementsQ.data || [])}
            loading={movementsQ.loading}
            rowKey={(m) => m.movement_id}
            pageSize={10}
            empty={{ icon: Coins, title: 'No cash movements yet', description: 'Deposits, withdrawals and vault movements appear here.' }}
          />
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          <VaultCard onDone={reload} />
          <AdjustCard onDone={reload} />
          <Button variant="danger" icon={LockKeyhole} className="w-full" onClick={() => setClosing(true)}>Close session (end of day)</Button>
        </div>
      </div>

      {closing && <CloseSessionModal summary={summary} onClose={() => setClosing(false)} onClosed={() => { setClosing(false); reload(); }} />}
    </div>
  );
}

function Tile({ label, value, tone, sign, strong }) {
  const toneCls = tone === 'success' ? 'text-success-600' : tone === 'danger' ? 'text-danger-600' : 'text-slate-900';
  return (
    <div className={cn('rounded-lg border p-3', strong ? 'border-brand-300 bg-brand-50' : 'border-slate-200')}>
      <div className="text-2xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cn('num font-semibold mt-1', strong ? 'text-lg text-brand-800' : toneCls)}>{sign}{formatMoney(value, 'GHS')}</div>
    </div>
  );
}

function VaultCard({ onDone }) {
  const toast = useToast();
  const [kind, setKind] = useState('request');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const amt = parseFloat(amount || '0');
    if (!(amt > 0)) return toast.error('Enter a valid amount');
    setBusy(true);
    try {
      await TellerApi.vault({ type: kind, amount: String(amt.toFixed(2)) });
      toast.success(kind === 'request' ? 'Cash received from vault' : 'Cash returned to vault');
      setAmount(''); onDone?.();
    } catch (err) { toast.error(err?.message || 'Vault movement failed'); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader title="Vault" icon={Vault} subtitle="Request or return cash" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {[['request', 'Request'], ['return', 'Return']].map(([v, label]) => (
            <button key={v} onClick={() => setKind(v)} className={cn('flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', kind === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>{label}</button>
          ))}
        </div>
        <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} mono placeholder="Amount (GHS)" />
        <Button variant="secondary" icon={Vault} loading={busy} onClick={submit} className="w-full">{kind === 'request' ? 'Receive from vault' : 'Return to vault'}</Button>
      </div>
    </Card>
  );
}

// AdjustCard — supervisor-only signed cash adjustment (needs approve_transaction).
function AdjustCard({ onDone }) {
  const toast = useToast();
  const { can } = useAuth();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!can('approve_transaction')) return null;

  const submit = async () => {
    const amt = parseFloat(amount || '0');
    if (!amt || Number.isNaN(amt)) return toast.error('Enter a non-zero amount (use − for shortages)');
    if (!note.trim()) return toast.error('A reason is required');
    setBusy(true);
    try {
      await TellerApi.adjust({ amount: String(amt.toFixed(2)), note: note.trim() });
      toast.success('Adjustment posted');
      setAmount(''); setNote(''); onDone?.();
    } catch (err) { toast.error(err?.message || 'Adjustment failed'); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader title="Cash adjustment" icon={Scale} subtitle="Supervisor · signed (− for shortage)" />
      <div className="p-4 space-y-3">
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} mono placeholder="e.g. -50.00" />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (required)" />
        <Button variant="secondary" icon={Scale} loading={busy} onClick={submit} className="w-full">Post adjustment</Button>
      </div>
    </Card>
  );
}

function CloseSessionModal({ summary, onClose, onClosed }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [counted, setCounted] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const expected = Number(summary.expected_cash || 0);
  const countedNum = parseFloat(counted || '');
  const variance = Number.isNaN(countedNum) ? null : countedNum - expected;
  const beyondTolerance = variance !== null && Math.abs(variance) > 10;

  const submit = async () => {
    if (Number.isNaN(countedNum) || countedNum < 0) return toast.error('Enter the counted cash');
    if (beyondTolerance && !reason.trim()) return toast.error('A reason is required for this variance');
    const ok = await confirm({
      title: 'Close session?',
      message: `Close your drawer with a counted total of ${formatMoney(countedNum, 'GHS')} (variance ${variance >= 0 ? '+' : '−'}${formatMoney(Math.abs(variance), 'GHS')}). You won't be able to handle cash until you open a new session.`,
      confirmLabel: 'Close session', tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await TellerApi.close({ counted_cash: String(countedNum.toFixed(2)), variance_reason: reason.trim() });
      toast.success('Session closed');
      onClosed?.();
    } catch (err) { toast.error(err?.message || 'Could not close session'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="End of day — reconcile & close" subtitle="Count the physical cash in your drawer"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" icon={LockKeyhole} loading={busy} onClick={submit}>Close session</Button></>}>
      <div className="space-y-3">
        <div className="rounded-md border border-slate-200 divide-y divide-slate-100 text-sm">
          <Row label="Expected cash" value={formatMoney(expected, 'GHS')} />
          {variance !== null && <Row label="Variance" value={<span className={cn('num font-semibold', variance === 0 ? 'text-slate-700' : variance > 0 ? 'text-success-600' : 'text-danger-600')}>{variance >= 0 ? '+' : '−'}{formatMoney(Math.abs(variance), 'GHS')}</span>} />}
        </div>
        <Field label="Counted cash (physical) (GHS)" required>
          <Input type="number" step="0.01" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} mono placeholder="0.00" autoFocus />
        </Field>
        {beyondTolerance && (
          <div className="flex items-start gap-2 text-sm text-warning-700 bg-warning-50 border border-warning-500/20 rounded-md px-3 py-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> This variance is beyond tolerance — a reason is required and it will be flagged for supervisor review.
          </div>
        )}
        {variance !== null && Math.abs(variance) > 0 && (
          <Field label="Variance reason" required={beyondTolerance}>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. short by GHS 50, recount pending" />
          </Field>
        )}
      </div>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="num text-slate-800">{value}</span>
    </div>
  );
}
