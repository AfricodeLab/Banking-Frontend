import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Wallet, ShieldCheck, Plus, Calendar, Landmark } from 'lucide-react';
import { CustomerApi, AccountApi, LoanApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { Card, CardHeader, Tabs, StatusPill, Button, DataTable, Spinner, Badge } from '../../components/ui/index.js';
import { formatMoney, formatDate, initials } from '../../lib/format.js';
import { OpenAccountModal } from '../accounts/OpenAccountModal.jsx';
import { useLeafCrumb } from '../../components/layout/Breadcrumbs.jsx';
import { asList } from '../accounts/accountsData.js';

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [openAcct, setOpenAcct] = useState(false);

  const customer = useAsync(() => CustomerApi.get(id), [id]);
  const accounts = useAsync(() => AccountApi.byCustomer(id).catch(() => []), [id]);
  const compliance = useAsync(() => CustomerApi.compliance(id).catch(() => []), [id]);
  const loans = useAsync(() => LoanApi.byCustomer(id).catch(() => []), [id]);

  const c = customer.data;
  useLeafCrumb(c?.name);
  const accList = asList(accounts.data);
  const loanList = asList(loans.data);

  if (customer.loading) {
    return <div className="flex items-center justify-center gap-2 py-24 text-slate-400"><Spinner size={20} /> Loading customer…</div>;
  }
  if (customer.error) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <p className="text-danger-600 font-medium">Could not load customer</p>
        <p className="text-sm text-slate-500 mt-1">{customer.error.message}</p>
        <Button variant="secondary" className="mt-4" icon={ArrowLeft} onClick={() => navigate('/customers')}>Back to customers</Button>
      </div>
    );
  }

  const accountColumns = [
    { key: 'account_id', header: 'Account #', className: 'num text-xs', render: (a) => (a.account_id || '').slice(0, 12) },
    { key: 'account_type', header: 'Type', render: (a) => <span className="capitalize">{a.account_type}</span> },
    { key: 'currency', header: 'Ccy', render: (a) => <Badge tone="neutral">{a.currency || 'USD'}</Badge> },
    { key: 'status', header: 'Status', render: (a) => <StatusPill status={a.status} /> },
    { key: 'balance', header: 'Balance', align: 'right', className: 'num font-medium text-slate-800', render: (a) => formatMoney(a.balance, a.currency) },
  ];

  const facts = [
    { icon: Mail, label: 'Email', value: c.email || '—' },
    { icon: Phone, label: 'Phone', value: c.phone || '—', mono: true },
    { icon: Calendar, label: 'Date of birth', value: formatDate(c.dob) },
    { icon: MapPin, label: 'Address', value: c.address || '—' },
  ];

  return (
    <div>
      <button onClick={() => navigate('/customers')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={15} /> Back to customers
      </button>

      {/* Record header */}
      <div className="card p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-brand-600 text-white text-xl font-semibold shrink-0">
            {initials(c.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">{c.name}</h1>
              <StatusPill status={c.kyc_status || 'pending'} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-400">
              <span className="num">CIF {(c.customer_id || '').slice(0, 12)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" onClick={() => navigate(`/loans/new?customer=${id}`)} icon={Landmark}>New loan</Button>
            <Button onClick={() => setOpenAcct(true)} icon={Plus}>Open account</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
          {facts.map((f) => (
            <div key={f.label} className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-400 shrink-0"><f.icon size={15} /></span>
              <div className="min-w-0">
                <div className="text-2xs uppercase tracking-wide text-slate-400">{f.label}</div>
                <div className={`text-sm text-slate-700 truncate ${f.mono ? 'num' : ''}`}>{f.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'accounts', label: 'Accounts', count: accList.length },
          { value: 'loans', label: 'Loans', count: loanList.length },
          { value: 'compliance', label: 'Compliance' },
        ]}
        className="mb-4"
      />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader title="Accounts summary" icon={Wallet}
              actions={<Button variant="ghost" size="sm" onClick={() => setTab('accounts')}>View all</Button>} />
            <DataTable columns={accountColumns} rows={accounts.loading ? null : accList} loading={accounts.loading}
              onRowClick={(a) => navigate(`/accounts/${a.account_id}`)} rowKey={(a) => a.account_id}
              empty={{ icon: Wallet, title: 'No accounts', description: 'This customer has no CASA accounts yet.' }} />
          </Card>
          <Card>
            <CardHeader title="Relationship" icon={ShieldCheck} />
            <div className="p-4 space-y-3 text-sm">
              <Row label="KYC status" value={<StatusPill status={c.kyc_status || 'pending'} />} />
              <Row label="Accounts" value={<span className="num">{accList.length}</span>} />
              <Row label="Total loans owed" value={<span className="num">{formatMoney(c.total_loans_owed || 0)}</span>} />
              <Row label="Onboarded" value={formatDate(c.created_at) !== '—' ? formatDate(c.created_at) : 'Recently'} />
            </div>
          </Card>
        </div>
      )}

      {tab === 'accounts' && (
        <Card>
          <CardHeader title="CASA accounts" icon={Wallet} actions={<Button size="sm" icon={Plus} onClick={() => setOpenAcct(true)}>Open account</Button>} />
          <DataTable columns={accountColumns} rows={accounts.loading ? null : accList} loading={accounts.loading}
            onRowClick={(a) => navigate(`/accounts/${a.account_id}`)} rowKey={(a) => a.account_id}
            empty={{ icon: Wallet, title: 'No accounts', description: 'Open a CASA account for this customer.' }} />
        </Card>
      )}

      {tab === 'loans' && (
        <Card>
          <CardHeader title="Loans" icon={Landmark} actions={<Button size="sm" icon={Plus} onClick={() => navigate(`/loans/new?customer=${id}`)}>New loan</Button>} />
          <DataTable
            columns={[
              { key: 'loan_id', header: 'Loan #', className: 'num text-xs', render: (l) => (l.loan_id || '').slice(0, 12) },
              { key: 'loan_type', header: 'Type', render: (l) => <span className="capitalize">{l.loan_type}</span> },
              { key: 'principal_amount', header: 'Principal', align: 'right', className: 'num', render: (l) => formatMoney(l.principal_amount, 'GHS') },
              { key: 'remaining_balance', header: 'Outstanding', align: 'right', className: 'num font-medium text-slate-800', render: (l) => formatMoney(l.remaining_balance, 'GHS') },
              { key: 'interest_rate', header: 'Rate', align: 'right', className: 'num', render: (l) => `${l.interest_rate}%` },
              { key: 'status', header: 'Status', render: (l) => <StatusPill status={l.status} /> },
            ]}
            rows={loans.loading ? null : loanList} loading={loans.loading}
            onRowClick={(l) => navigate(`/loans/${l.loan_id}`)} rowKey={(l) => l.loan_id}
            empty={{ icon: Landmark, title: 'No loans', description: 'Originate a loan for this customer.', action: <Button size="sm" icon={Plus} onClick={() => navigate(`/loans/new?customer=${id}`)}>New loan</Button> }} />
        </Card>
      )}

      {tab === 'compliance' && (
        <Card>
          <CardHeader title="Compliance & KYC" icon={ShieldCheck} />
          <div className="p-4">
            {compliance.loading ? (
              <div className="flex items-center gap-2 text-slate-400 py-6"><Spinner size={16} /> Loading…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Row label="KYC status" value={<StatusPill status={c.kyc_status || 'pending'} />} />
                <Row label="Risk rating" value={<Badge tone="neutral">Not assessed</Badge>} />
                <Row label="Records" value={<span className="num">{Array.isArray(compliance.data) ? compliance.data.length : 0}</span>} />
              </div>
            )}
          </div>
        </Card>
      )}
      <OpenAccountModal
        open={openAcct}
        onClose={() => setOpenAcct(false)}
        presetCustomerId={id}
        onCreated={() => { accounts.reload(); setTab('accounts'); }}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400 text-xs uppercase tracking-wide">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
