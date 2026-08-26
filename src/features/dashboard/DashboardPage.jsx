import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, Receipt, Landmark, Plus, ArrowRight, Activity } from 'lucide-react';
import { CustomerApi, BranchApi, TransactionApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { PageHeader, StatCard, Card, CardHeader, Button, DataTable, StatusPill, Badge } from '../../components/ui/index.js';
import { formatDate, initials } from '../../lib/format.js';

const asList = (r) => (Array.isArray(r) ? r : r?.data || []);

export function DashboardPage() {
  const navigate = useNavigate();
  const customers = useAsync(() => CustomerApi.list({ limit: 100 }), []);
  const branches = useAsync(() => BranchApi.list(), []);
  const txStats = useAsync(() => TransactionApi.stats().catch(() => null), []);

  const custList = asList(customers.data);
  const branchList = asList(branches.data);
  const recent = [...custList].slice(-6).reverse();
  const kycPending = custList.filter((c) => String(c.kyc_status).toLowerCase() !== 'verified').length;

  const columns = [
    {
      key: 'name', header: 'Customer',
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 text-xs font-semibold">{initials(c.name)}</span>
          <div className="min-w-0">
            <div className="font-medium text-slate-800 truncate">{c.name}</div>
            <div className="text-xs text-slate-400 truncate">{c.email || c.phone || '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'kyc_status', header: 'KYC', render: (c) => <StatusPill status={c.kyc_status || 'pending'} /> },
    { key: 'customer_id', header: 'CIF', className: 'num text-xs text-slate-500', render: (c) => (c.customer_id || '').slice(0, 8) },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Bank-wide operational overview"
        actions={<Button icon={Plus} onClick={() => navigate('/customers/new')}>New customer</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total customers" value={customers.loading ? '—' : custList.length} icon={Users} accent="brand" footer="Active CIF records" />
        <StatCard label="Branches" value={branches.loading ? '—' : branchList.length} icon={Building2} accent="teal" footer="Operating network" />
        <StatCard label="KYC pending" value={customers.loading ? '—' : kycPending} icon={Activity} accent="warning" footer="Awaiting verification" />
        <StatCard label="Transactions today" value={txStats.data?.total ?? txStats.data?.count ?? 0} icon={Receipt} accent="success" footer="Across all channels" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Recently onboarded customers" icon={Users}
            actions={<Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => navigate('/customers')}>View all</Button>} />
          <DataTable
            columns={columns}
            rows={customers.loading ? null : recent}
            loading={customers.loading}
            error={customers.error}
            onRowClick={(c) => navigate(`/customers/${c.customer_id}`)}
            rowKey={(c) => c.customer_id}
            empty={{ title: 'No customers yet', description: 'Onboard your first customer to get started.' }}
          />
        </Card>

        <Card>
          <CardHeader title="Quick actions" icon={Landmark} />
          <div className="p-3 space-y-1.5">
            {[
              { label: 'Onboard customer', to: '/customers/new', tone: 'brand' },
              { label: 'Open CASA account', to: '/accounts', tone: 'teal' },
              { label: 'Teller — deposit / withdraw', to: '/teller', tone: 'success' },
              { label: 'Book a loan', to: '/loans', tone: 'warning' },
              { label: 'Review KYC queue', to: '/compliance', tone: 'danger' },
            ].map((a) => (
              <button key={a.to} onClick={() => navigate(a.to)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-left">
                <span className="text-sm font-medium text-slate-700">{a.label}</span>
                <ArrowRight size={15} className="text-slate-300" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
