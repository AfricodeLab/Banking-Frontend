import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Users } from 'lucide-react';
import { CustomerApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { PageHeader, Card, DataTable, StatusPill, Button, Toolbar, ToolbarRow, ToolbarSpacer, SearchInput, ResultCount } from '../../components/ui/index.js';
import { formatDate, initials } from '../../lib/format.js';

const asList = (r) => (Array.isArray(r) ? r : r?.data || []);

export function CustomerListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data, loading, error } = useAsync(() => CustomerApi.list({ limit: 200 }), []);

  const rows = useMemo(() => {
    const list = asList(data);
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((c) => [c.name, c.email, c.phone, c.customer_id].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
  }, [data, q]);

  const columns = [
    {
      key: 'name', header: 'Customer',
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 text-xs font-semibold shrink-0">{initials(c.name)}</span>
          <div className="min-w-0">
            <div className="font-medium text-slate-800 truncate">{c.name}</div>
            <div className="text-xs text-slate-400 truncate">{c.email || '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', className: 'num text-xs', render: (c) => c.phone || '—' },
    { key: 'address', header: 'Address', render: (c) => <span className="text-slate-500">{c.address || '—'}</span> },
    { key: 'kyc_status', header: 'KYC', render: (c) => <StatusPill status={c.kyc_status || 'pending'} /> },
    { key: 'customer_id', header: 'CIF', align: 'right', className: 'num text-xs text-slate-500', render: (c) => (c.customer_id || '').slice(0, 8) },
  ];

  const list = asList(data);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customer Information File — search, onboard and manage relationships"
        actions={
          <>
            <Button variant="secondary" icon={Download}>Export</Button>
            <Button icon={Plus} onClick={() => navigate('/customers/new')}>New customer</Button>
          </>
        }
      />

      <Card>
        <Toolbar>
          <ToolbarRow>
            <SearchInput value={q} onChange={setQ} placeholder="Search name, email, phone or CIF…" width="w-80" />
            <ToolbarSpacer />
            <ResultCount shown={rows.length} total={list.length} noun="customers" loading={loading} />
          </ToolbarRow>
        </Toolbar>

        <DataTable
          columns={columns}
          rows={loading ? null : rows}
          loading={loading}
          error={error}
          onRowClick={(c) => navigate(`/customers/${c.customer_id}`)}
          rowKey={(c) => c.customer_id}
          empty={{ icon: Users, title: q ? 'No matching customers' : 'No customers yet', description: q ? 'Try a different search term.' : 'Onboard your first customer to begin.', action: !q && <Button icon={Plus} onClick={() => navigate('/customers/new')}>New customer</Button> }}
        />
      </Card>
    </div>
  );
}
