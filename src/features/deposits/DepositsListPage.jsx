import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PiggyBank, Landmark, Percent, Info } from 'lucide-react';
import { useAsync } from '../../lib/useAsync.js';
import { loadAllAccounts } from '../accounts/accountsData.js';
import { getTD, maturity } from './tdStore.js';
import { PageHeader, Card, DataTable, StatusPill, Badge, Button, StatCard, Toolbar, ToolbarRow, ToolbarSpacer, SearchInput, ResultCount } from '../../components/ui/index.js';
import { formatMoney, formatDate } from '../../lib/format.js';

export function DepositsListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data, loading, error } = useAsync(async () => {
    const all = await loadAllAccounts();
    return all
      .filter((a) => String(a.account_type).toLowerCase().includes('fixed'))
      .map((a) => {
        const td = getTD(a.account_id);
        const m = td ? maturity(td) : null;
        return { ...a, td, maturityValue: m?.value, maturityDate: m?.date };
      });
  }, []);

  const deposits = data || [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return deposits;
    return deposits.filter((d) => [d.account_id, d.customer_name, d.currency].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
  }, [deposits, q]);

  const totalPrincipal = deposits.reduce((s, d) => s + (parseFloat(d.balance) || 0), 0);
  const avgRate = deposits.length ? deposits.reduce((s, d) => s + (d.td?.rate || 0), 0) / deposits.filter((d) => d.td).length || 0 : 0;

  const columns = [
    { key: 'account_id', header: 'Deposit #', className: 'num text-xs', render: (d) => (d.account_id || '').slice(0, 14) },
    { key: 'customer_name', header: 'Customer', render: (d) => <span className="font-medium text-slate-800">{d.customer_name || '—'}</span> },
    { key: 'balance', header: 'Principal', align: 'right', className: 'num', render: (d) => formatMoney(d.balance, d.currency) },
    { key: 'rate', header: 'Rate', align: 'right', className: 'num', render: (d) => (d.td ? `${d.td.rate}%` : '—') },
    { key: 'tenor', header: 'Tenor', align: 'right', className: 'num', render: (d) => (d.td ? `${d.td.tenorMonths}m` : '—') },
    { key: 'maturityDate', header: 'Matures', render: (d) => (d.maturityDate ? formatDate(d.maturityDate) : '—') },
    { key: 'maturityValue', header: 'At maturity', align: 'right', className: 'num font-semibold text-slate-800', render: (d) => (d.maturityValue ? formatMoney(d.maturityValue, d.currency) : '—') },
    { key: 'status', header: 'Status', render: (d) => <StatusPill status={d.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Term Deposits" description="Fixed-tenor deposit book"
        actions={<Button icon={Plus} onClick={() => navigate('/deposits/new')}>Book deposit</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Total principal" value={loading ? '—' : formatMoney(totalPrincipal, deposits[0]?.currency || 'USD')} icon={Landmark} accent="brand" />
        <StatCard label="Active deposits" value={loading ? '—' : deposits.length} icon={PiggyBank} accent="teal" />
        <StatCard label="Avg. rate" value={loading ? '—' : `${(avgRate || 0).toFixed(1)}%`} icon={Percent} accent="success" />
      </div>

      <Card>
        <Toolbar>
          <ToolbarRow>
            <SearchInput value={q} onChange={setQ} placeholder="Search deposit #, customer…" width="w-80" />
            <ToolbarSpacer />
            <ResultCount shown={rows.length} noun="deposits" loading={loading} />
          </ToolbarRow>
        </Toolbar>
        <DataTable columns={columns} rows={loading ? null : rows} loading={loading} error={error}
          onRowClick={(d) => navigate(`/accounts/${d.account_id}`)} rowKey={(d) => d.account_id}
          empty={{ icon: PiggyBank, title: q ? 'No matching deposits' : 'No term deposits yet', description: q ? 'Try another search.' : 'Book the first fixed deposit.', action: !q && <Button icon={Plus} onClick={() => navigate('/deposits/new')}>Book deposit</Button> }} />
      </Card>

      <div className="flex items-start gap-2 mt-3 text-xs text-slate-400">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>Term deposits are held in fixed-type accounts. Tenor, rate and maturity are tracked in the console pending a dedicated term-deposit service in the core banking API.</p>
      </div>
    </div>
  );
}
