import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, PiggyBank, Calculator } from 'lucide-react';
import { CustomerApi, AccountApi, DepositApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { PageHeader, Card, CardHeader, CardBody, Field, Input, Select, Button, useToast } from '../../components/ui/index.js';
import { formatMoney, formatDate } from '../../lib/format.js';
import { asList } from '../accounts/accountsData.js';

// Simple-interest maturity illustration (matches the backend's accrual model).
function illustrate({ principal, rate, tenorMonths }) {
  const interest = principal * (rate / 100) * (tenorMonths / 12);
  const date = new Date();
  date.setMonth(date.getMonth() + tenorMonths);
  return { value: principal + interest, interest, date: date.toISOString() };
}

export function BookDepositPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const customers = useAsync(() => CustomerApi.list({ limit: 500 }).then(asList), []);

  const [form, setForm] = useState({
    customer_id: params.get('customer') || '',
    account_id: '',
    product_type: 'fixed',
    principal: '',
    tenure_months: '12',
    interest_rate: '7.5',
    recurring_amount: '',
    penalty_rate: '25',
    auto_renew: false,
  });
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Load the selected customer's settlement (CASA) accounts.
  useEffect(() => {
    if (!form.customer_id) { setAccounts([]); return; }
    AccountApi.byCustomer(form.customer_id).then(asList).then((list) =>
      setAccounts(list.filter((a) => String(a.status).toLowerCase() === 'active'))
    ).catch(() => setAccounts([]));
  }, [form.customer_id]);

  const principal = parseFloat(form.principal) || 0;
  const rate = parseFloat(form.interest_rate) || 0;
  const tenor = parseInt(form.tenure_months, 10) || 0;
  const selectedAcct = accounts.find((a) => a.account_id === form.account_id);
  const m = useMemo(() => illustrate({ principal, rate, tenorMonths: tenor }), [principal, rate, tenor]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.account_id) return toast.error('Select a settlement account');
    if (principal <= 0) return toast.error('Enter a valid principal');
    if (selectedAcct && parseFloat(selectedAcct.balance) < principal) return toast.error('Settlement account has insufficient balance');
    setSaving(true);
    try {
      const d = await DepositApi.open({
        account_id: form.account_id,
        customer_id: form.customer_id || undefined,
        product_type: form.product_type,
        principal: String(principal.toFixed(2)),
        interest_rate: String(rate),
        tenure_months: tenor,
        recurring_amount: form.product_type === 'recurring' ? String(parseFloat(form.recurring_amount) || 0) : '0',
        penalty_rate: String(parseFloat(form.penalty_rate) || 0),
        auto_renew: form.auto_renew,
      });
      toast.success('Deposit booked', { title: `${d.reference} · ${formatMoney(principal, selectedAcct?.currency)}` });
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
      <PageHeader title="Book deposit" description="Lock a fixed or recurring deposit funded from a customer account" />

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
            <Field label="Settlement account" required hint={form.customer_id && !accounts.length ? 'No active accounts' : 'Principal is locked from this account'}>
              <Select value={form.account_id} onChange={set('account_id')} disabled={!form.customer_id}>
                <option value="">Select account…</option>
                {accounts.map((a) => <option key={a.account_id} value={a.account_id}>{a.account_type} · {a.currency} {Number(a.balance).toLocaleString()} · {a.account_id.slice(0, 8)}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Product">
                <Select value={form.product_type} onChange={set('product_type')}>
                  <option value="fixed">Fixed (term) deposit</option>
                  <option value="recurring">Recurring deposit</option>
                </Select>
              </Field>
              <Field label="Principal" required>
                <Input value={form.principal} onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="0.00" mono inputMode="decimal" />
              </Field>
              <Field label="Tenor (months)" required>
                <Select value={form.tenure_months} onChange={set('tenure_months')}>
                  {[3, 6, 9, 12, 18, 24, 36].map((t) => <option key={t} value={t}>{t} months</option>)}
                </Select>
              </Field>
              <Field label="Rate (% p.a.)" required>
                <Input value={form.interest_rate} onChange={(e) => setForm((f) => ({ ...f, interest_rate: e.target.value.replace(/[^0-9.]/g, '') }))} mono inputMode="decimal" />
              </Field>
              {form.product_type === 'recurring' && (
                <Field label="Monthly contribution" className="sm:col-span-2">
                  <Input value={form.recurring_amount} onChange={(e) => setForm((f) => ({ ...f, recurring_amount: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="0.00" mono inputMode="decimal" />
                </Field>
              )}
              <Field label="Early-break penalty (% of interest)">
                <Input value={form.penalty_rate} onChange={(e) => setForm((f) => ({ ...f, penalty_rate: e.target.value.replace(/[^0-9.]/g, '') }))} mono inputMode="decimal" />
              </Field>
              <Field label="At maturity">
                <label className="inline-flex items-center gap-2 h-9 text-sm text-slate-600">
                  <input type="checkbox" checked={form.auto_renew} onChange={(e) => setForm((f) => ({ ...f, auto_renew: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-brand-600" />
                  Auto-renew (pay interest, relock principal)
                </label>
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
            <Figure label="Maturity value" value={formatMoney(m.value, selectedAcct?.currency || 'GHS')} big />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Figure label="Interest earned" value={formatMoney(m.interest, selectedAcct?.currency || 'GHS')} />
              <Figure label="Principal" value={formatMoney(principal, selectedAcct?.currency || 'GHS')} />
              <Figure label="Tenor" value={`${tenor} months`} />
              <Figure label="Matures" value={m.date ? formatDate(m.date) : '—'} />
            </div>
            <p className="text-2xs text-slate-400 pt-1">Simple interest at {rate}% p.a., accrued daily by the core. Principal is locked from the settlement account via the ledger.</p>
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
