import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, PiggyBank, Calculator } from 'lucide-react';
import { AccountApi, TransactionApi, CustomerApi, BranchApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { PageHeader, Card, CardHeader, CardBody, Field, Input, Select, Button, useToast } from '../../components/ui/index.js';
import { formatMoney, formatDate } from '../../lib/format.js';
import { saveTD, maturity } from './tdStore.js';
import { asList } from '../accounts/accountsData.js';
import { BASE_CURRENCY, CURRENCIES } from '../../lib/config.js';

export function BookDepositPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const customers = useAsync(() => CustomerApi.list({ limit: 500 }).then(asList), []);
  const branches = useAsync(() => BranchApi.list().then(asList), []);

  const [form, setForm] = useState({
    customer_id: params.get('customer') || '',
    principal: '',
    currency: BASE_CURRENCY,
    tenor: '12',
    rate: '7.5',
    branch_id: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const principal = parseFloat(form.principal) || 0;
  const rate = parseFloat(form.rate) || 0;
  const tenor = parseInt(form.tenor, 10) || 0;
  const m = useMemo(() => maturity({ principal, rate, tenorMonths: tenor, openedAt: new Date().toISOString() }), [principal, rate, tenor]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) return toast.error('Select a customer');
    if (!form.branch_id) return toast.error('Select a branch');
    if (principal <= 0) return toast.error('Enter a valid principal');
    setSaving(true);
    try {
      const acct = await AccountApi.create({
        customer_id: form.customer_id,
        account_type: 'fixed',
        currency: form.currency,
        branch_id: form.branch_id,
      });
      await TransactionApi.create({
        to_account_id: acct.account_id,
        amount: String(principal.toFixed(2)),
        transaction_type: 'deposit',
        description: `Term deposit funding — ${tenor}m @ ${rate}%`,
      });
      saveTD(acct.account_id, {
        principal, rate, tenorMonths: tenor, currency: form.currency,
        customerId: form.customer_id, openedAt: new Date().toISOString(),
      });
      toast.success('Term deposit booked', { title: `${formatMoney(principal, form.currency)} · ${tenor}m` });
      navigate('/deposits');
    } catch (err) {
      toast.error(err?.message || 'Could not book deposit');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <button onClick={() => navigate('/deposits')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={15} /> Back to deposits
      </button>
      <PageHeader title="Book term deposit" description="Lock a fixed-tenor deposit for a customer" />

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        <Card>
          <CardHeader title="Deposit details" icon={PiggyBank} />
          <CardBody className="space-y-4">
            <Field label="Customer" required hint={customers.loading ? 'Loading…' : undefined}>
              <Select value={form.customer_id} onChange={set('customer_id')} disabled={!!params.get('customer')}>
                <option value="">Select customer…</option>
                {(customers.data || []).map((c) => <option key={c.customer_id} value={c.customer_id}>{c.name} — {c.email}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Principal" required>
                <Input value={form.principal} onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="0.00" mono inputMode="decimal" />
              </Field>
              <Field label="Currency" required>
                <Select value={form.currency} onChange={set('currency')}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Tenor (months)" required>
                <Select value={form.tenor} onChange={set('tenor')}>
                  {[3, 6, 9, 12, 18, 24, 36].map((t) => <option key={t} value={t}>{t} months</option>)}
                </Select>
              </Field>
              <Field label="Rate (% p.a.)" required>
                <Input value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value.replace(/[^0-9.]/g, '') }))} mono inputMode="decimal" />
              </Field>
              <Field label="Branch" required className="sm:col-span-2" hint={branches.loading ? 'Loading…' : undefined}>
                <Select value={form.branch_id} onChange={set('branch_id')}>
                  <option value="">Select branch…</option>
                  {(branches.data || []).map((b) => <option key={b.branch_id} value={b.branch_id}>{b.location}</option>)}
                </Select>
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => navigate('/deposits')}>Cancel</Button>
              <Button type="submit" icon={PiggyBank} loading={saving}>Book deposit</Button>
            </div>
          </CardBody>
        </Card>

        <Card className="self-start">
          <CardHeader title="Maturity illustration" icon={Calculator} />
          <CardBody className="space-y-3">
            <Figure label="Maturity value" value={formatMoney(m.value, form.currency)} big />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Figure label="Interest earned" value={formatMoney(m.interest, form.currency)} />
              <Figure label="Principal" value={formatMoney(principal, form.currency)} />
              <Figure label="Tenor" value={`${tenor} months`} />
              <Figure label="Matures" value={m.date ? formatDate(m.date) : '—'} />
            </div>
            <p className="text-2xs text-slate-400 pt-1">Simple interest at {rate}% p.a. Funds are held in a fixed-type account.</p>
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
