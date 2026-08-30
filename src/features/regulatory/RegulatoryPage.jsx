import React, { useMemo, useState } from 'react';
import { FileWarning, Banknote, ShieldAlert, Layers, MoonStar, CheckCircle2, XCircle } from 'lucide-react';
import { RegulatoryApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import {
  PageHeader, Card, DataTable, Badge, Button, StatCard, StatusPill,
  Toolbar, ToolbarRow, ToolbarSpacer, SearchInput, ResultCount, FilterSelect, ToolbarFilters,
  useToast,
} from '../../components/ui/index.js';
import { Can } from '../../lib/auth/Can.jsx';
import { formatMoney, formatDateTime } from '../../lib/format.js';

const TYPES = ['all', 'CTR', 'SAR', 'STR', 'DORMANCY'];
const TYPE_TONE = { CTR: 'brand', SAR: 'danger', STR: 'warning', DORMANCY: 'slate' };
const TYPE_LABEL = {
  CTR: 'Currency Transaction Report', SAR: 'Suspicious Activity Report',
  STR: 'Structuring', DORMANCY: 'Dormant account',
};

export function RegulatoryPage() {
  const toast = useToast();
  const [type, setType] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');
  const { data, loading, error, reload } = useAsync(() => RegulatoryApi.reports({ limit: 500 }), []);

  const reports = data?.reports || [];
  const summary = data?.summary || { by_type: {}, open: 0 };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return reports.filter((r) => {
      if (type !== 'all' && r.report_type !== type) return false;
      if (statusF !== 'all' && r.status !== statusF) return false;
      if (term && ![r.account_id, r.customer_id, r.reason, r.transaction_id].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))) return false;
      return true;
    });
  }, [reports, type, statusF, q]);

  const run = async (fn, label) => {
    setBusy(label);
    try { const r = await fn(); toast.success(`${label}: ${r.generated ?? r.flagged ?? 0} generated`); reload(); }
    catch (err) { toast.error(err?.message || `${label} failed`); }
    finally { setBusy(''); }
  };

  const decide = async (r, status) => {
    try { await RegulatoryApi.decide(r.report_id, status); toast.success(status === 'filed' ? 'Report filed' : 'Report dismissed'); reload(); }
    catch (err) { toast.error(err?.message || 'Action failed'); }
  };

  const columns = [
    { key: 'report_type', header: 'Type', render: (r) => <Badge tone={TYPE_TONE[r.report_type] || 'slate'} title={TYPE_LABEL[r.report_type]}>{r.report_type}</Badge> },
    { key: 'reason', header: 'Finding', render: (r) => <span className="text-slate-700">{r.reason}</span> },
    { key: 'amount', header: 'Amount', align: 'right', className: 'num font-medium text-slate-800', render: (r) => (Number(r.amount) ? formatMoney(r.amount, r.currency) : '—') },
    { key: 'account_id', header: 'Account', className: 'num text-xs text-slate-400', render: (r) => (r.account_id || '—').slice(0, 12) },
    { key: 'created_at', header: 'Raised', render: (r) => <span className="text-slate-500 text-xs">{formatDateTime(r.created_at)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
    {
      key: 'actions', header: '', align: 'right', render: (r) => r.status === 'open' ? (
        <Can permission="approve_transaction">
          <div className="flex items-center gap-1 justify-end">
            <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => decide(r, 'filed')}>File</Button>
            <Button size="sm" variant="ghost" icon={XCircle} onClick={() => decide(r, 'dismissed')}>Dismiss</Button>
          </div>
        </Can>
      ) : <span className="text-2xs text-slate-400">{r.reviewed_by ? 'reviewed' : ''}</span>,
    },
  ];

  const activeFilters = (type !== 'all' ? 1 : 0) + (statusF !== 'all' ? 1 : 0);

  return (
    <div>
      <PageHeader title="Regulatory reporting" description="CTR, SAR, structuring detection & dormancy — statutory compliance"
        actions={
          <Can permission="approve_transaction">
            <Button variant="secondary" icon={Banknote} loading={busy === 'CTR'} onClick={() => run(() => RegulatoryApi.generateCTR({ threshold: 10000 }), 'CTR')}>Generate CTR</Button>
            <Button variant="secondary" icon={Layers} loading={busy === 'Structuring'} onClick={() => run(() => RegulatoryApi.detectStructuring({ threshold: 10000 }), 'Structuring')}>Detect structuring</Button>
            <Button variant="secondary" icon={ShieldAlert} loading={busy === 'SAR'} onClick={() => run(RegulatoryApi.generateSAR, 'SAR')}>Generate SAR</Button>
            <Button variant="secondary" icon={MoonStar} loading={busy === 'Dormancy'} onClick={() => run(() => RegulatoryApi.dormancySweep({ days: 180 }), 'Dormancy')}>Dormancy sweep</Button>
          </Can>
        } />

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-5">
        <StatCard label="Open items" value={loading ? '—' : summary.open} icon={FileWarning} accent="danger" />
        <StatCard label="CTR" value={loading ? '—' : (summary.by_type.CTR || 0)} icon={Banknote} accent="brand" />
        <StatCard label="SAR" value={loading ? '—' : (summary.by_type.SAR || 0)} icon={ShieldAlert} accent="warning" />
        <StatCard label="Structuring" value={loading ? '—' : (summary.by_type.STR || 0)} icon={Layers} accent="warning" />
        <StatCard label="Dormant" value={loading ? '—' : (summary.by_type.DORMANCY || 0)} icon={MoonStar} accent="slate" />
      </div>

      <Card>
        <Toolbar>
          <ToolbarRow>
            <ResultCount shown={rows.length} total={reports.length} noun="reports" loading={loading} />
            <ToolbarSpacer />
            <SearchInput value={q} onChange={setQ} placeholder="Search account, reason…" />
          </ToolbarRow>
          <ToolbarFilters active={activeFilters} onClear={() => { setType('all'); setStatusF('all'); }}>
            <FilterSelect label="Type" value={type} onChange={setType} options={TYPES.map((t) => ({ value: t, label: t === 'all' ? 'All types' : t }))} />
            <FilterSelect label="Status" value={statusF} onChange={setStatusF} options={['all', 'open', 'filed', 'dismissed'].map((s) => ({ value: s, label: s === 'all' ? 'All statuses' : s }))} />
          </ToolbarFilters>
        </Toolbar>
        <DataTable columns={columns} rows={loading ? null : rows} loading={loading} error={error} rowKey={(r) => r.report_id}
          empty={{ icon: FileWarning, title: 'No reports', description: 'Run a generator above to produce compliance reports from transaction and risk data.' }} />
      </Card>
    </div>
  );
}
