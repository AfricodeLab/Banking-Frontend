import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Eye } from 'lucide-react';
import { RiskApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import {
  PageHeader, Card, DataTable, Badge, Button, StatCard,
  Toolbar, ToolbarRow, ToolbarSpacer, SegmentedControl, ResultCount, useToast, useConfirm,
} from '../../components/ui/index.js';
import { formatMoney, formatDateTime } from '../../lib/format.js';

const SEV_TONE = { high: 'danger', medium: 'warning', low: 'neutral' };
const STATUSES = [{ value: 'open', label: 'Open' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'cleared', label: 'Cleared' }, { value: '', label: 'All' }];

export function RiskAlertsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState('open');
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
    { key: 'reasons', header: 'Flags', render: (a) => <span className="text-slate-700">{a.reasons}</span> },
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
      <PageHeader title="Risk & Fraud Alerts" description="Transactions flagged by monitoring rules — review and clear" />

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
          empty={{ icon: ShieldAlert, title: 'No alerts', description: 'Flagged transactions will appear here for review.' }}
        />
      </Card>
    </div>
  );
}
