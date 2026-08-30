import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PiggyBank, Percent, Landmark, RefreshCw } from 'lucide-react';
import { DepositApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import {
  PageHeader, Card, DataTable, StatusPill, Badge, Button, StatCard,
  Toolbar, ToolbarRow, ToolbarSpacer, SearchInput, ResultCount, FilterSelect, ToolbarFilters,
  useToast, useConfirm,
} from '../../components/ui/index.js';
import { Can } from '../../lib/auth/Can.jsx';
import { formatMoney, formatDate } from '../../lib/format.js';

const STATUSES = ['all', 'active', 'matured', 'broken'];

export function DepositsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const { data, loading, error, reload } = useAsync(
    () => DepositApi.list().then((r) => r.deposits || []), []);

  const deposits = data || [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return deposits.filter((d) => {
      if (status !== 'all' && d.status !== status) return false;
      if (term && ![d.reference, d.customer_id, d.currency, d.product_type].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))) return false;
      return true;
    });
  }, [deposits, q, status]);

  const totals = useMemo(() => {
    const active = deposits.filter((d) => d.status === 'active');
    return {
      count: active.length,
      principal: active.reduce((s, d) => s + Number(d.principal || 0), 0),
      interest: active.reduce((s, d) => s + Number(d.interest_accrued || 0), 0),
    };
  }, [deposits]);

  const breakDeposit = async (d) => {
    const ok = await confirm({
      title: `Break deposit ${d.reference}?`,
      message: `Principal ${formatMoney(d.principal, d.currency)} plus interest (less penalty) returns to the settlement account. This cannot be undone.`,
      confirmLabel: 'Break deposit', tone: 'danger',
    });
    if (!ok) return;
    try { await DepositApi.break(d.deposit_id); toast.success('Deposit broken — funds returned'); reload(); }
    catch (err) { toast.error(err?.message || 'Could not break deposit'); }
  };

  const runJob = async (fn, label) => {
    try { await fn(); toast.success(`${label} complete`); reload(); }
    catch (err) { toast.error(err?.message || `${label} failed`); }
  };

  const columns = [
    { key: 'reference', header: 'Reference', className: 'num text-xs', render: (d) => d.reference },
    { key: 'product_type', header: 'Product', render: (d) => <Badge tone={d.product_type === 'recurring' ? 'brand' : 'slate'}>{d.product_type}</Badge> },
    { key: 'principal', header: 'Principal', align: 'right', className: 'num font-semibold text-slate-800', render: (d) => formatMoney(d.principal, d.currency) },
    { key: 'interest_rate', header: 'Rate', align: 'right', className: 'num text-slate-600', render: (d) => `${Number(d.interest_rate)}%` },
    { key: 'interest_accrued', header: 'Interest', align: 'right', className: 'num text-emerald-600', render: (d) => formatMoney(d.interest_accrued, d.currency) },
    { key: 'maturity_date', header: 'Matures', render: (d) => <span className="text-slate-500">{formatDate(d.maturity_date)}</span> },
    { key: 'status', header: 'Status', render: (d) => <StatusPill status={d.status} /> },
    {
      key: 'actions', header: '', align: 'right', render: (d) => d.status === 'active' ? (
        <Can permission="update_account"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); breakDeposit(d); }}>Break</Button></Can>
      ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Deposits" description="Fixed & recurring term deposits"
        actions={
          <>
            <Can permission="admin">
              <Button variant="secondary" icon={Percent} onClick={() => runJob(DepositApi.runAccrual, 'Interest accrual')}>Run accrual</Button>
              <Button variant="secondary" icon={RefreshCw} onClick={() => runJob(DepositApi.runMaturity, 'Maturity')}>Run maturity</Button>
            </Can>
            <Can permission="create_account">
              <Button icon={Plus} onClick={() => navigate('/deposits/new')}>Book deposit</Button>
            </Can>
          </>
        } />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Active deposits" value={loading ? '—' : totals.count} icon={PiggyBank} accent="brand" />
        <StatCard label="Principal under management" value={loading ? '—' : formatMoney(totals.principal)} icon={Landmark} accent="success" />
        <StatCard label="Interest accrued" value={loading ? '—' : formatMoney(totals.interest)} icon={Percent} accent="warning" />
      </div>

      <Card>
        <Toolbar>
          <ToolbarRow>
            <SearchInput value={q} onChange={setQ} placeholder="Search reference, customer…" width="w-80" />
            <ToolbarSpacer />
            <ResultCount shown={rows.length} total={deposits.length} noun="deposits" loading={loading} />
          </ToolbarRow>
          <ToolbarFilters active={status !== 'all' ? 1 : 0} onClear={() => setStatus('all')}>
            <FilterSelect label="Status" value={status} onChange={setStatus}
              options={STATUSES.map((s) => ({ value: s, label: s === 'all' ? 'All statuses' : s }))} />
          </ToolbarFilters>
        </Toolbar>
        <DataTable columns={columns} rows={loading ? null : rows} loading={loading} error={error}
          rowKey={(d) => d.deposit_id}
          empty={{ icon: PiggyBank, title: q ? 'No matching deposits' : 'No deposits yet', description: q ? 'Try another search.' : 'Book a term or recurring deposit to get started.' }} />
      </Card>
    </div>
  );
}
