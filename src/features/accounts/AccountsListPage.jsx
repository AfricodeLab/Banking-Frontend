import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wallet, Landmark, Layers } from 'lucide-react';
import { useAsync } from '../../lib/useAsync.js';
import { loadAllAccounts } from './accountsData.js';
import { PageHeader, Card, DataTable, StatusPill, Badge, Button, StatCard, Toolbar, ToolbarRow, ToolbarSpacer, SearchInput, ResultCount } from '../../components/ui/index.js';
import { formatMoney } from '../../lib/format.js';
import { OpenAccountModal } from './OpenAccountModal.jsx';
import { PermissionButton } from '../../lib/auth/Can.jsx';

export function AccountsListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { data, loading, error, reload } = useAsync(() => loadAllAccounts(), []);

  const accounts = data || [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((a) => [a.account_id, a.customer_name, a.account_type, a.currency].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
  }, [accounts, q]);

  const totalByCcy = useMemo(() => {
    const m = {};
    accounts.forEach((a) => { const c = a.currency || 'USD'; m[c] = (m[c] || 0) + parseFloat(a.balance || 0); });
    return m;
  }, [accounts]);
  const primaryCcy = Object.keys(totalByCcy)[0] || 'USD';

  const columns = [
    { key: 'account_id', header: 'Account #', className: 'num text-xs', render: (a) => (a.account_id || '').slice(0, 14) },
    { key: 'customer_name', header: 'Customer', render: (a) => <span className="font-medium text-slate-800">{a.customer_name || '—'}</span> },
    { key: 'account_type', header: 'Type', render: (a) => <span className="capitalize text-slate-600">{a.account_type}</span> },
    { key: 'currency', header: 'Ccy', render: (a) => <Badge tone="neutral">{a.currency || 'USD'}</Badge> },
    { key: 'status', header: 'Status', render: (a) => <StatusPill status={a.status} /> },
    { key: 'balance', header: 'Balance', align: 'right', className: 'num font-semibold text-slate-800', render: (a) => formatMoney(a.balance, a.currency) },
  ];

  return (
    <div>
      <PageHeader
        title="CASA Accounts"
        description="Current & savings account portfolio"
        actions={<PermissionButton permission="create_account" icon={Plus} onClick={() => setOpen(true)}>Open account</PermissionButton>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Total accounts" value={loading ? '—' : accounts.length} icon={Wallet} accent="brand" />
        <StatCard label={`Deposits (${primaryCcy})`} value={loading ? '—' : formatMoney(totalByCcy[primaryCcy] || 0, primaryCcy)} icon={Landmark} accent="teal" />
        <StatCard label="Active" value={loading ? '—' : accounts.filter((a) => String(a.status).toLowerCase() === 'active').length} icon={Layers} accent="success" />
      </div>

      <Card>
        <Toolbar>
          <ToolbarRow>
            <SearchInput value={q} onChange={setQ} placeholder="Search account #, customer, type…" width="w-80" />
            <ToolbarSpacer />
            <ResultCount shown={rows.length} total={accounts.length} noun="accounts" loading={loading} />
          </ToolbarRow>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={loading ? null : rows}
          loading={loading}
          error={error}
          onRowClick={(a) => navigate(`/accounts/${a.account_id}`)}
          rowKey={(a) => a.account_id}
          empty={{ icon: Wallet, title: q ? 'No matching accounts' : 'No accounts yet', description: q ? 'Try another search.' : 'Open the first CASA account.', action: !q && <Button icon={Plus} onClick={() => setOpen(true)}>Open account</Button> }}
        />
      </Card>

      <OpenAccountModal open={open} onClose={() => setOpen(false)} onCreated={() => reload()} />
    </div>
  );
}
