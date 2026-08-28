import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Eye, Sparkles, Bot } from 'lucide-react';
import { RiskApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import {
  PageHeader, Card, DataTable, Badge, Button, StatCard, Modal,
  Toolbar, ToolbarRow, ToolbarSpacer, SegmentedControl, ResultCount, useToast, useConfirm,
} from '../../components/ui/index.js';
import { formatMoney, formatDateTime } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const SEV_TONE = { high: 'danger', medium: 'warning', low: 'neutral' };
const DEC_TONE = { BLOCK: 'danger', REVIEW: 'warning', ALLOW: 'success' };
const STATUSES = [{ value: 'open', label: 'Open' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'cleared', label: 'Cleared' }, { value: '', label: 'All' }];

export function RiskAlertsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState('open');
  const [selected, setSelected] = useState(null);
  const { data, loading, error, reload } = useAsync(() => RiskApi.alerts(status), [status]);
  const rows = data?.alerts || [];

  const decide = async (a, decision) => {
    const ok = await confirm({
      title: decision === 'cleared' ? 'Clear this alert?' : 'Mark as reviewed?',
      message: decision === 'cleared'
        ? 'Confirm the transaction has been verified and is not suspicious.'
        : 'Mark this alert as reviewed (kept for the record).',
      confirmLabel: decision === 'cleared' ? 'Clear' : 'Mark reviewed',
    });
    if (!ok) return;
    try { await RiskApi.decide(a.alert_id, decision, ''); toast.success('Alert updated'); reload(); }
    catch (err) { toast.error(err?.message || 'Could not update'); }
  };

  const columns = [
    { key: 'severity', header: 'Severity', render: (a) => <Badge tone={SEV_TONE[a.severity] || 'neutral'}>{a.severity}</Badge> },
    {
      key: 'reasons', header: 'Flags', render: (a) => (
        <div>
          <div className="text-slate-700">{a.reasons}</div>
          <div className="text-2xs text-slate-400 mt-0.5">source: {a.source || 'rules'}</div>
        </div>
      ),
    },
    {
      key: 'ai', header: 'AI verdict', render: (a) => (
        (a.decision || Number(a.score) > 0)
          ? <div className="flex items-center gap-1.5">
              {a.decision && <Badge tone={DEC_TONE[a.decision] || 'neutral'}>{a.decision}</Badge>}
              {Number(a.score) > 0 && <span className="num text-xs text-slate-500">{Math.round(Number(a.score) * 100)}%</span>}
            </div>
          : <span className="text-2xs text-slate-300">—</span>
      ),
    },
    { key: 'account_id', header: 'Account', className: 'num text-xs text-slate-400', render: (a) => a.account_id ? `${a.account_id.slice(0, 10)}…` : '—' },
    { key: 'created_at', header: 'When', render: (a) => <span className="text-slate-500 text-xs">{formatDateTime(a.created_at)}</span> },
    { key: 'status', header: 'Status', render: (a) => <Badge tone={a.status === 'open' ? 'warning' : a.status === 'cleared' ? 'success' : 'neutral'}>{a.status}</Badge> },
    { key: 'amount', header: 'Amount', align: 'right', className: 'num font-semibold text-slate-800', render: (a) => formatMoney(a.amount, a.currency) },
    {
      key: 'actions', header: '', align: 'right', width: '180px',
      render: (a) => a.status === 'open' ? (
        <div className="flex items-center justify-end gap-1.5">
          <Button size="xs" variant="ghost" icon={Eye} onClick={(e) => { e.stopPropagation(); decide(a, 'reviewed'); }}>Reviewed</Button>
          <Button size="xs" variant="success" icon={CheckCircle2} onClick={(e) => { e.stopPropagation(); decide(a, 'cleared'); }}>Clear</Button>
        </div>
      ) : <span className="text-2xs text-slate-400">{a.reviewed_by ? 'decided' : ''}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Risk & Fraud Alerts" description="Transactions flagged by rules + the Sentinel AI service — review and clear" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Open alerts" value={data?.open ?? (loading ? '—' : 0)} icon={ShieldAlert} accent="danger" />
        <StatCard label="High severity" value={loading ? '—' : rows.filter((a) => a.severity === 'high').length} icon={ShieldAlert} accent="warning" />
        <StatCard label="Showing" value={loading ? '—' : rows.length} icon={Eye} accent="brand" />
      </div>

      <Card>
        <Toolbar>
          <ToolbarRow>
            <SegmentedControl options={STATUSES} value={status} onChange={setStatus} />
            <ToolbarSpacer />
            <ResultCount shown={rows.length} noun="alerts" loading={loading} />
          </ToolbarRow>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={loading ? null : rows}
          loading={loading}
          error={error}
          rowKey={(a) => a.alert_id}
          onRowClick={(a) => setSelected(a)}
          empty={{ icon: ShieldAlert, title: 'No alerts', description: 'Flagged transactions will appear here for review.' }}
        />
      </Card>

      <AlertDetailModal
        alert={selected}
        onClose={() => setSelected(null)}
        onDecided={(a, decision) => { setSelected(null); decide(a, decision); }}
      />
    </div>
  );
}

// AlertDetailModal — full alert with the AI analyst explanation prominently shown.
function AlertDetailModal({ alert: a, onClose, onDecided }) {
  if (!a) return null;
  const open = a.status === 'open';
  return (
    <Modal open={!!a} onClose={onClose} title="Risk alert" subtitle={a.reference_number || (a.transaction_id ? `Txn ${a.transaction_id.slice(0, 12)}…` : '')} size="lg"
      footer={open ? (
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="ghost" icon={Eye} onClick={() => onDecided(a, 'reviewed')}>Mark reviewed</Button>
          <Button variant="success" icon={CheckCircle2} onClick={() => onDecided(a, 'cleared')}>Clear</Button>
        </>
      ) : <Button onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniField label="Severity"><Badge tone={SEV_TONE[a.severity] || 'neutral'}>{a.severity}</Badge></MiniField>
          <MiniField label="AI decision">{a.decision ? <Badge tone={DEC_TONE[a.decision] || 'neutral'}>{a.decision}</Badge> : <span className="text-slate-400 text-sm">—</span>}</MiniField>
          <MiniField label="Fraud score"><span className="num font-semibold text-slate-800">{Number(a.score) > 0 ? `${Math.round(Number(a.score) * 100)}%` : '—'}</span></MiniField>
          <MiniField label="Amount"><span className="num font-semibold text-slate-800">{formatMoney(a.amount, a.currency)}</span></MiniField>
        </div>

        <div>
          <div className="text-2xs uppercase tracking-wide text-slate-400 mb-1.5">Flags</div>
          <div className="flex flex-wrap gap-1.5">
            {String(a.reasons || '').split(',').filter(Boolean).map((r) => <Badge key={r} tone="warning">{r.trim()}</Badge>)}
          </div>
          <div className="text-2xs text-slate-400 mt-1.5">Detected by: {a.source || 'rules'}</div>
        </div>

        {/* The AI analyst explanation (the "reason") */}
        {a.explanation ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 mb-1.5">
              <Bot size={14} /> AI analyst assessment
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{a.explanation}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 p-3.5 text-sm text-slate-400">
            No AI explanation — this alert was raised by rules only.
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-slate-100 pt-3">
          <MiniField label="Account"><span className="num text-xs">{a.account_id ? `${a.account_id.slice(0, 16)}…` : '—'}</span></MiniField>
          <MiniField label="Raised"><span className="text-slate-600">{formatDateTime(a.created_at)}</span></MiniField>
          <MiniField label="Status"><Badge tone={a.status === 'open' ? 'warning' : a.status === 'cleared' ? 'success' : 'neutral'}>{a.status}</Badge></MiniField>
          {a.reviewed_by && <MiniField label="Reviewed by"><span className="num text-xs">{a.reviewed_by.slice(0, 12)}…</span></MiniField>}
        </div>
      </div>
    </Modal>
  );
}

function MiniField({ label, children }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-slate-400 mb-0.5">{label}</div>
      <div>{children}</div>
    </div>
  );
}
