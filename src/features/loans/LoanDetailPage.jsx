import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Landmark, Calculator, CalendarClock, User, HandCoins, CheckCircle2 } from 'lucide-react';
import { LoanApi, CustomerApi, AccountApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { Card, CardHeader, CardBody, Tabs, StatusPill, Badge, Button, DataTable, Spinner, Modal, Field, Input, Select, useToast } from '../../components/ui/index.js';
import { formatMoney } from '../../lib/format.js';
import { buildSchedule } from './loanCalc.js';
import { asList } from '../accounts/accountsData.js';
import { useLeafCrumb } from '../../components/layout/Breadcrumbs.jsx';

export function LoanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [payOpen, setPayOpen] = useState(false);

  const summary = useAsync(() => LoanApi.summary(id), [id]);
  const s = summary.data;
  const loan = s?.loan;
  const owner = useAsync(() => (loan?.customer_id ? CustomerApi.get(loan.customer_id).catch(() => null) : Promise.resolve(null)), [loan?.customer_id]);
  useLeafCrumb(loan ? `${loan.loan_type} loan` : null);

  if (summary.loading) return <div className="flex items-center justify-center gap-2 py-24 text-slate-400"><Spinner size={20} /> Loading loan…</div>;
  if (summary.error || !loan) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <p className="text-danger-600 font-medium">Could not load loan</p>
      <p className="text-sm text-slate-500 mt-1">{summary.error?.message}</p>
      <Button variant="secondary" className="mt-4" icon={ArrowLeft} onClick={() => navigate('/loans')}>Back to loans</Button>
    </div>
  );

  const schedule = buildSchedule(loan.principal_amount, loan.interest_rate, loan.duration_months);
  const repaid = (Number(loan.principal_amount) || 0) - (Number(loan.remaining_balance) || 0);
  const progress = loan.principal_amount ? Math.min(100, Math.round((repaid / loan.principal_amount) * 100)) : 0;
  const isActive = String(loan.status).toLowerCase() === 'active';

  const setStatus = async (status) => {
    try { await LoanApi.updateStatus(id, status); toast.success(`Loan ${status}`); summary.reload(); }
    catch (err) { toast.error(err?.message || 'Could not update status'); }
  };

  return (
    <div>
      <button onClick={() => navigate('/loans')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={15} /> Back to loans
      </button>

      {/* Header */}
      <div className="card p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 text-white shrink-0"><Landmark size={24} /></span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm capitalize font-medium text-slate-700">{loan.loan_type} loan</span>
                <Badge tone="neutral">GHS</Badge>
                <StatusPill status={loan.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="num text-xs text-slate-400">{loan.loan_id}</span>
                {owner.data && (
                  <Link to={`/customers/${loan.customer_id}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                    <User size={12} /> {owner.data.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="lg:text-right">
            <div className="text-2xs uppercase tracking-wide text-slate-400">Outstanding</div>
            <div className="num text-3xl font-semibold text-slate-900 leading-tight">{formatMoney(loan.remaining_balance, 'GHS')}</div>
            <div className="text-xs text-slate-400">of {formatMoney(loan.principal_amount, 'GHS')} principal</div>
          </div>
          <div className="flex items-center gap-2 lg:pl-5 lg:border-l border-slate-100">
            <Button icon={HandCoins} disabled={!isActive} onClick={() => setPayOpen(true)}>Repayment</Button>
            {isActive
              ? <Button variant="secondary" onClick={() => setStatus('closed')}>Close</Button>
              : <Button variant="secondary" onClick={() => setStatus('active')}>Reopen</Button>}
          </div>
        </div>

        {/* Progress */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Repayment progress</span>
            <span className="num">{progress}% · {formatMoney(repaid, 'GHS')} repaid</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <Tabs value={tab} onChange={setTab} className="mb-4"
        tabs={[{ value: 'overview', label: 'Overview' }, { value: 'schedule', label: 'Amortization', count: schedule.length }]} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader title="Repayment summary" icon={Calculator} />
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Figure label="Monthly" value={formatMoney(s.monthly_payment, 'GHS')} big />
                <Figure label="Total repayable" value={formatMoney(s.total_payment, 'GHS')} />
                <Figure label="Total interest" value={formatMoney(s.total_interest, 'GHS')} />
                <Figure label="Rate" value={`${loan.interest_rate}% p.a.`} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Terms" icon={CalendarClock} />
            <div className="p-4 space-y-2.5 text-sm">
              <Row label="Principal" value={<span className="num">{formatMoney(loan.principal_amount, 'GHS')}</span>} />
              <Row label="Outstanding" value={<span className="num">{formatMoney(loan.remaining_balance, 'GHS')}</span>} />
              <Row label="Term" value={<span className="num">{loan.duration_months} months</span>} />
              <Row label="Product" value={<span className="capitalize">{loan.loan_type}</span>} />
              <Row label="Status" value={<StatusPill status={loan.status} />} />
            </div>
          </Card>
        </div>
      )}

      {tab === 'schedule' && (
        <Card>
          <CardHeader title="Amortization schedule" icon={CalendarClock} subtitle={`${schedule.length} equal monthly installments`} />
          <DataTable
            columns={[
              { key: 'n', header: '#', className: 'num text-slate-400', width: '56px' },
              { key: 'payment', header: 'Installment', align: 'right', className: 'num', render: (r) => formatMoney(r.payment, 'GHS') },
              { key: 'principal', header: 'Principal', align: 'right', className: 'num text-slate-600', render: (r) => formatMoney(r.principal, 'GHS') },
              { key: 'interest', header: 'Interest', align: 'right', className: 'num text-slate-600', render: (r) => formatMoney(r.interest, 'GHS') },
              { key: 'balance', header: 'Balance', align: 'right', className: 'num font-medium text-slate-800', render: (r) => formatMoney(r.balance, 'GHS') },
            ]}
            rows={schedule} rowKey={(r) => r.n} />
        </Card>
      )}

      <RepaymentModal open={payOpen} onClose={() => setPayOpen(false)} loan={loan} onPaid={() => summary.reload()} />
    </div>
  );
}

function RepaymentModal({ open, onClose, loan, onPaid }) {
  const toast = useToast();
  const accounts = useAsync(() => AccountApi.byCustomer(loan.customer_id).then(asList).catch(() => []), [loan.customer_id], { immediate: open });
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const acctList = accounts.data || [];

  const submit = async () => {
    const amt = parseFloat(amount) || 0;
    if (!accountId) return toast.error('Select the source account');
    if (amt <= 0) return toast.error('Enter a valid amount');
    setBusy(true);
    try {
      await LoanApi.pay(loan.loan_id, accountId, amt);
      toast.success('Repayment posted', { title: formatMoney(amt, 'GHS') });
      onPaid?.();
      onClose();
      setAmount('');
    } catch (err) { toast.error(err?.message || 'Repayment failed'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Make repayment" subtitle={`Outstanding ${formatMoney(loan.remaining_balance, 'GHS')}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={CheckCircle2} loading={busy} onClick={submit}>Post repayment</Button></>}>
      <div className="space-y-4">
        <Field label="Source account (debited)" required hint={accounts.loading ? 'Loading accounts…' : undefined}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select account…</option>
            {acctList.map((a) => <option key={a.account_id} value={a.account_id}>{a.account_type} · {a.currency} · {formatMoney(a.balance, a.currency)}</option>)}
          </Select>
        </Field>
        <Field label="Amount (GHS)" required>
          <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" mono inputMode="decimal" />
        </Field>
      </div>
    </Modal>
  );
}

function Figure({ label, value, big }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`num font-semibold text-slate-900 ${big ? 'text-2xl' : 'text-sm'}`}>{value}</div>
    </div>
  );
}
function Row({ label, value }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-xs uppercase tracking-wide text-slate-400">{label}</span><span className="text-slate-700">{value}</span></div>;
}
