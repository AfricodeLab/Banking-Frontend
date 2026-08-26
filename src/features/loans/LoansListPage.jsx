import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Landmark, Wallet, TrendingUp } from 'lucide-react';
import { LoanApi, CustomerApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { PageHeader, Card, DataTable, StatusPill, Button, StatCard, Toolbar, ToolbarRow, ToolbarSpacer, SearchInput, ResultCount } from '../../components/ui/index.js';
import { formatMoney } from '../../lib/format.js';
import { asList } from '../accounts/accountsData.js';

export function LoansListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data, loading, error } = useAsync(async () => {
    const [loans, customers] = await Promise.all([
      LoanApi.list().then(asList).catch(() => []),
      CustomerApi.list({ limit: 500 }).then(asList).catch(() => []),
    ]);
    const nameById = Object.fromEntries(customers.map((c) => [c.customer_id, c.name]));
    return loans.map((l) => ({ ...l, customer_name: nameById[l.customer_id] || '—' }));
  }, []);

  const loans = data || [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return loans;
    return loans.filter((l) => [l.loan_id, l.customer_name, l.loan_type, l.status].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
  }, [loans, q]);

  const outstanding = loans.reduce((s, l) => s + (Number(l.remaining_balance) || 0), 0);
  const disbursed = loans.reduce((s, l) => s + (Number(l.principal_amount) || 0), 0);
  const active = loans.filter((l) => String(l.status).toLowerCase() === 'active').length;

  const columns = [
    { key: 'loan_id', header: 'Loan #', className: 'num text-xs', render: (l) => (l.loan_id || '').slice(0, 12) },
    { key: 'customer_name', header: 'Customer', render: (l) => <span className="font-medium text-slate-800">{l.customer_name}</span> },
    { key: 'loan_type', header: 'Product', render: (l) => <span className="capitalize text-slate-600">{l.loan_type}</span> },
    { key: 'principal_amount', header: 'Principal', align: 'right', className: 'num', render: (l) => formatMoney(l.principal_amount, 'GHS') },
    { key: 'remaining_balance', header: 'Outstanding', align: 'right', className: 'num font-semibold text-slate-800', render: (l) => formatMoney(l.remaining_balance, 'GHS') },
    { key: 'interest_rate', header: 'Rate', align: 'right', className: 'num', render: (l) => `${l.interest_rate}%` },
    { key: 'duration_months', header: 'Term', align: 'right', className: 'num', render: (l) => `${l.duration_months}m` },
    { key: 'status', header: 'Status', render: (l) => <StatusPill status={l.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Loans" description="Loan origination & servicing portfolio"
        actions={<Button icon={Plus} onClick={() => navigate('/loans/new')}>New loan</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Outstanding (GHS)" value={loading ? '—' : formatMoney(outstanding, 'GHS')} icon={Wallet} accent="brand" />
        <StatCard label="Total disbursed" value={loading ? '—' : formatMoney(disbursed, 'GHS')} icon={TrendingUp} accent="teal" />
        <StatCard label="Active loans" value={loading ? '—' : active} icon={Landmark} accent="success" />
      </div>

      <Card>
        <Toolbar>
          <ToolbarRow>
            <SearchInput value={q} onChange={setQ} placeholder="Search loan #, customer, product…" width="w-80" />
            <ToolbarSpacer />
            <ResultCount shown={rows.length} noun="loans" loading={loading} />
          </ToolbarRow>
        </Toolbar>
        <DataTable columns={columns} rows={loading ? null : rows} loading={loading} error={error}
          onRowClick={(l) => navigate(`/loans/${l.loan_id}`)} rowKey={(l) => l.loan_id}
          empty={{ icon: Landmark, title: q ? 'No matching loans' : 'No loans yet', description: q ? 'Try another search.' : 'Originate the first loan.', action: !q && <Button icon={Plus} onClick={() => navigate('/loans/new')}>New loan</Button> }} />
      </Card>
    </div>
  );
}
