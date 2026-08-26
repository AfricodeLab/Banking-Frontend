import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Landmark, Calculator } from 'lucide-react';
import { LoanApi, CustomerApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { PageHeader, Card, CardHeader, CardBody, Field, Input, Select, Button, useToast } from '../../components/ui/index.js';
import { formatMoney } from '../../lib/format.js';
import { monthlyPayment } from './loanCalc.js';
import { asList } from '../accounts/accountsData.js';

const PRODUCTS = ['personal', 'mortgage', 'auto', 'business', 'education', 'agricultural'];

export function LoanCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const customers = useAsync(() => CustomerApi.list({ limit: 500 }).then(asList), []);

  const [form, setForm] = useState({
    customer_id: params.get('customer') || '',
    loan_type: 'personal',
    principal_amount: '',
    interest_rate: '18',
    duration_months: '24',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const p = parseFloat(form.principal_amount) || 0;
  const rate = parseFloat(form.interest_rate) || 0;
  const months = parseInt(form.duration_months, 10) || 0;
  const mPay = useMemo(() => monthlyPayment(p, rate, months), [p, rate, months]);
  const total = mPay * months;
  const interest = Math.max(0, total - p);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) return toast.error('Select a customer');
    if (p <= 0) return toast.error('Enter a valid principal amount');
    if (months <= 0) return toast.error('Enter a valid term');
    setSaving(true);
    try {
      const loan = await LoanApi.create({
        customer_id: form.customer_id,
        loan_type: form.loan_type,
        principal_amount: p,
        interest_rate: rate,
        duration_months: months,
      });
      toast.success('Loan originated & disbursed', { title: `${form.loan_type} · ${formatMoney(p, 'GHS')}` });
      navigate(`/loans/${loan.loan_id}`);
    } catch (err) {
      toast.error(err?.message || 'Could not create loan');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <button onClick={() => navigate('/loans')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={15} /> Back to loans
      </button>
      <PageHeader title="Originate loan" description="Book a loan — principal is disbursed to the customer's account (GHS)" />

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        <Card>
          <CardHeader title="Loan application" icon={Landmark} />
          <CardBody className="space-y-4">
            <Field label="Customer" required hint={customers.loading ? 'Loading customers…' : undefined}>
              <Select value={form.customer_id} onChange={set('customer_id')} disabled={!!params.get('customer')}>
                <option value="">Select customer…</option>
                {(customers.data || []).map((c) => <option key={c.customer_id} value={c.customer_id}>{c.name} — {c.email}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Product" required>
                <Select value={form.loan_type} onChange={set('loan_type')}>
                  {PRODUCTS.map((t) => <option key={t} value={t} className="capitalize">{t[0].toUpperCase() + t.slice(1)}</option>)}
                </Select>
              </Field>
              <Field label="Principal (GHS)" required>
                <Input value={form.principal_amount} onChange={(e) => setForm((f) => ({ ...f, principal_amount: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="0.00" mono inputMode="decimal" />
              </Field>
              <Field label="Interest rate (% p.a.)" required>
                <Input value={form.interest_rate} onChange={(e) => setForm((f) => ({ ...f, interest_rate: e.target.value.replace(/[^0-9.]/g, '') }))} mono inputMode="decimal" />
              </Field>
              <Field label="Term (months)" required>
                <Input value={form.duration_months} onChange={(e) => setForm((f) => ({ ...f, duration_months: e.target.value.replace(/[^0-9]/g, '') }))} mono inputMode="numeric" />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => navigate('/loans')}>Cancel</Button>
              <Button type="submit" icon={Landmark} loading={saving}>Originate loan</Button>
            </div>
          </CardBody>
        </Card>

        {/* Live repayment illustration */}
        <Card className="self-start">
          <CardHeader title="Repayment illustration" icon={Calculator} />
          <CardBody className="space-y-3">
            <Figure label="Monthly repayment" value={formatMoney(mPay, 'GHS')} big />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Figure label="Total repayable" value={formatMoney(total, 'GHS')} />
              <Figure label="Total interest" value={formatMoney(interest, 'GHS')} />
              <Figure label="Principal" value={formatMoney(p, 'GHS')} />
              <Figure label="Term" value={`${months} months`} />
            </div>
            <p className="text-2xs text-slate-400 pt-1">Amortized equal-installment schedule at {rate}% p.a. Figures are indicative.</p>
          </CardBody>
        </Card>
      </form>
    </div>
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
