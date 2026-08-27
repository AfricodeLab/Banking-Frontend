import React, { useState } from 'react';
import {
  ShieldCheck, CheckCircle2, XCircle, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  RotateCcw, Receipt, UserCheck,
} from 'lucide-react';
import { ApprovalApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import {
  PageHeader, Card, DataTable, StatusPill, Button, Badge, Modal, Field, Textarea,
  Toolbar, ToolbarRow, ToolbarSpacer, ResultCount, useToast, useConfirm,
} from '../../components/ui/index.js';
import { formatMoney, formatDateTime } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const TYPE_ICON = { deposit: ArrowDownLeft, withdrawal: ArrowUpRight, transfer: ArrowLeftRight };
const TYPE_TONE = { deposit: 'bg-success-50 text-success-600', withdrawal: 'bg-danger-50 text-danger-600', transfer: 'bg-brand-50 text-brand-600' };

export function ApprovalsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => ApprovalApi.list(), []);
  const [rejecting, setRejecting] = useState(null);

  const rows = data?.approvals || [];
  const threshold = data?.threshold;

  const approve = async (t) => {
    const ok = await confirm({
      title: 'Approve transaction?',
      message: `Post ${formatMoney(t.amount, t.currency)} (${t.transaction_type}${t.reversal_of_id ? ', reversal' : ''}). This moves money and is recorded against your name as approver.`,
      confirmLabel: 'Approve & post',
    });
    if (!ok) return;
    try {
      await ApprovalApi.approve(t.transaction_id);
      toast.success('Approved and posted');
      reload();
    } catch (err) {
      toast.error(err?.message || 'Could not approve');
    }
  };

  const columns = [
    {
      key: 'transaction_type', header: 'Type', width: '160px',
      render: (t) => {
        const Icon = TYPE_ICON[t.transaction_type] || Receipt;
        return (
          <div className="flex items-center gap-2">
            <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg shrink-0', TYPE_TONE[t.transaction_type] || 'bg-slate-100 text-slate-500')}><Icon size={14} /></span>
            <div>
              <div className="capitalize font-medium text-slate-700 leading-tight">{t.transaction_type}</div>
              {t.reversal_of_id && <span className="inline-flex items-center gap-1 text-2xs text-slate-400"><RotateCcw size={10} /> reversal</span>}
            </div>
          </div>
        );
      },
    },
    { key: 'description', header: 'Details', render: (t) => <span className="text-slate-600">{t.description || '—'}</span> },
    { key: 'reference_number', header: 'Reference', className: 'num text-xs text-slate-400', render: (t) => t.reference_number || '—' },
    {
      key: 'teller_id', header: 'Initiated by',
      render: (t) => (
        <span className="text-xs text-slate-500">
          {t.teller_id === user?.user_id ? <Badge tone="warning">you</Badge> : `${String(t.teller_id || '').slice(0, 8)}…`}
        </span>
      ),
    },
    { key: 'transaction_date', header: 'Submitted', render: (t) => <span className="text-slate-500 text-xs">{formatDateTime(t.transaction_date)}</span> },
    { key: 'amount', header: 'Amount', align: 'right', className: 'num font-semibold text-slate-800', render: (t) => formatMoney(t.amount, t.currency) },
    {
      key: 'actions', header: '', align: 'right', width: '190px',
      render: (t) => {
        const own = t.teller_id === user?.user_id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {own ? (
              <span className="text-2xs text-slate-400" title="You initiated this — a different officer must approve it">Awaiting another officer</span>
            ) : (
              <>
                <Button size="xs" variant="ghost" icon={XCircle} onClick={(e) => { e.stopPropagation(); setRejecting(t); }}>Reject</Button>
                <Button size="xs" variant="success" icon={CheckCircle2} onClick={(e) => { e.stopPropagation(); approve(t); }}>Approve</Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Approvals" description="Dual-authorization queue — a second officer must approve high-value transactions and reversals" />

      <div className="flex items-start gap-2.5 mb-4 text-sm text-brand-800 bg-brand-50 border border-brand-200 rounded-lg px-4 py-3">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-600" />
        <div>
          <span className="font-medium">Four-eyes control.</span> Transactions at or above{' '}
          <span className="num font-semibold">{threshold != null ? formatMoney(threshold, 'GHS') : '—'}</span>, and all reversals, are held here until an officer
          other than the initiator approves them. You cannot approve your own.
        </div>
      </div>

      <Card>
        <Toolbar>
          <ToolbarRow>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><UserCheck size={16} className="text-slate-400" /> Pending approvals</div>
            <ToolbarSpacer />
            <ResultCount shown={rows.length} noun="pending" loading={loading} />
          </ToolbarRow>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={loading ? null : rows}
          loading={loading}
          error={error}
          rowKey={(t) => t.transaction_id}
          empty={{ icon: ShieldCheck, title: 'Nothing to approve', description: 'High-value transactions and reversals awaiting authorization will appear here.' }}
        />
      </Card>

      <RejectModal
        txn={rejecting}
        onClose={() => setRejecting(null)}
        onRejected={() => { setRejecting(null); reload(); }}
      />
    </div>
  );
}

function RejectModal({ txn, onClose, onRejected }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!txn) return null;

  const submit = async () => {
    if (!reason.trim()) return toast.error('Enter a reason for rejection');
    setBusy(true);
    try {
      await ApprovalApi.reject(txn.transaction_id, reason.trim());
      toast.success('Transaction rejected');
      onRejected?.();
      setReason('');
    } catch (err) {
      toast.error(err?.message || 'Could not reject');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!txn} onClose={onClose} title="Reject transaction" subtitle={txn.reference_number}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" icon={XCircle} loading={busy} onClick={submit}>Reject</Button></>}>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
          <span className="capitalize text-sm text-slate-600">{txn.transaction_type}{txn.reversal_of_id ? ' · reversal' : ''}</span>
          <span className="num font-semibold text-slate-800">{formatMoney(txn.amount, txn.currency)}</span>
        </div>
        <Field label="Reason for rejection" required hint="Recorded on the transaction and in the audit trail.">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. not supported by documentation; suspected error" rows={3} />
        </Field>
      </div>
    </Modal>
  );
}
