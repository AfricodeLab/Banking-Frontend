import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Search, Check, Eye, Ban, Clock, UserCheck } from 'lucide-react';
import { CustomerApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { PageHeader, Card, DataTable, StatusPill, Badge, Button, Input, StatCard, useToast } from '../../components/ui/index.js';
import { formatDate, initials } from '../../lib/format.js';
import { asList } from '../accounts/accountsData.js';
import { cn } from '../../lib/cn.js';

const FILTERS = [
  { key: 'queue', label: 'Review queue' },
  { key: 'verified', label: 'Verified' },
  { key: 'high_risk', label: 'High risk' },
  { key: 'all', label: 'All' },
];

const RISK_TONE = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' };

export function CompliancePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('queue');
  const [busyId, setBusyId] = useState(null);
  const { data, loading, error, reload } = useAsync(() => CustomerApi.list({ limit: 500 }).then(asList), []);

  const customers = data || [];
  const isVerified = (c) => String(c.kyc_status).toLowerCase() === 'verified';
  const isHighRisk = (c) => ['high', 'critical'].includes(String(c.risk_rating).toLowerCase());

  const counts = useMemo(() => ({
    pending: customers.filter((c) => !isVerified(c)).length,
    verified: customers.filter(isVerified).length,
    highRisk: customers.filter(isHighRisk).length,
  }), [customers]);

  const rows = useMemo(() => {
    let list = customers;
    if (filter === 'queue') list = customers.filter((c) => !isVerified(c));
    else if (filter === 'verified') list = customers.filter(isVerified);
    else if (filter === 'high_risk') list = customers.filter(isHighRisk);
    const term = q.trim().toLowerCase();
    if (term) list = list.filter((c) => [c.name, c.email, c.id_number].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
    return list;
  }, [customers, filter, q]);

  const act = async (c, status, label) => {
    setBusyId(c.customer_id);
    try {
      await CustomerApi.update(c.customer_id, { kyc_status: status });
      toast.success(`${c.name} — ${label}`);
      await reload();
    } catch (err) {
      toast.error(err?.message || 'Could not update');
    } finally { setBusyId(null); }
  };

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
    { key: 'id', header: 'ID document', render: (c) => c.id_number ? <span className="num text-xs text-slate-600">{(c.id_type || '').replace(/_/g, ' ')} · {c.id_number}</span> : <Badge tone="warning">No ID</Badge> },
    { key: 'risk', header: 'Risk', render: (c) => <Badge tone={RISK_TONE[String(c.risk_rating).toLowerCase()] || 'neutral'}>{c.risk_rating || 'n/a'}</Badge> },
    { key: 'kyc', header: 'KYC', render: (c) => <StatusPill status={c.kyc_status || 'pending'} /> },
    {
      key: 'actions', header: '', align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {!isVerified(c) && <Button size="xs" variant="success" icon={Check} loading={busyId === c.customer_id} onClick={() => act(c, 'verified', 'verified')}>Verify</Button>}
          {String(c.kyc_status).toLowerCase() !== 'review' && !isVerified(c) && <Button size="xs" variant="subtle" icon={Eye} onClick={() => act(c, 'review', 'under review')}>Review</Button>}
          {isVerified(c) && <Button size="xs" variant="ghost" icon={Ban} onClick={() => act(c, 'review', 'sent to review')}>Revoke</Button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="KYC / AML" description="Customer due diligence — verification queue & risk"
        actions={<Button variant="secondary" icon={ShieldAlert} onClick={() => navigate('/customers')}>All customers</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Awaiting verification" value={loading ? '—' : counts.pending} icon={Clock} accent={counts.pending ? 'warning' : 'success'} footer="In the review queue" />
        <StatCard label="Verified" value={loading ? '—' : counts.verified} icon={UserCheck} accent="success" footer="Passed KYC" />
        <StatCard label="High risk" value={loading ? '—' : counts.highRisk} icon={ShieldAlert} accent={counts.highRisk ? 'danger' : 'slate'} footer="Enhanced due diligence" />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', filter === f.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs sm:ml-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, ID…" className="pl-9" />
          </div>
        </div>
        <DataTable columns={columns} rows={loading ? null : rows} loading={loading} error={error}
          onRowClick={(c) => navigate(`/customers/${c.customer_id}`)} rowKey={(c) => c.customer_id}
          empty={{ icon: ShieldCheck, title: filter === 'queue' ? 'Queue is clear' : 'No customers', description: filter === 'queue' ? 'All customers have passed KYC verification.' : 'Nothing to show for this filter.' }} />
      </Card>
    </div>
  );
}
