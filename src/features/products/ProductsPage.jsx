import React, { useState } from 'react';
import { Package, Plus, Percent, Play, Trash2 } from 'lucide-react';
import { ProductApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import {
  PageHeader, Card, CardHeader, CardBody, DataTable, Badge, Button, StatCard,
  Field, Input, Select, Modal, useToast, useConfirm,
} from '../../components/ui/index.js';
import { Can } from '../../lib/auth/Can.jsx';
import { formatMoney } from '../../lib/format.js';

const CATEGORIES = ['savings', 'current', 'term_deposit', 'loan', 'overdraft'];
const FEE_TYPES = ['maintenance', 'min_balance_penalty', 'transaction', 'dormancy', 'atm', 'sms'];

export function ProductsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAsync(() => ProductApi.list().then((r) => r.products || []), []);
  const products = data || [];
  const [creating, setCreating] = useState(false);
  const [feeFor, setFeeFor] = useState(null);

  const runFees = async () => {
    if (!(await confirm({ title: 'Apply monthly fees now?', message: 'Charges every account its product’s fee schedule via the ledger.', confirmLabel: 'Run fees' }))) return;
    try { const r = await ProductApi.runFees(); toast.success(`Applied ${r.charges_posted} charges (${formatMoney(r.total_amount)})`); reload(); }
    catch (err) { toast.error(err?.message || 'Fee run failed'); }
  };

  const removeFee = async (productId, feeId) => {
    try { await ProductApi.removeFee(productId, feeId); toast.success('Fee removed'); reload(); }
    catch (err) { toast.error(err?.message || 'Could not remove fee'); }
  };

  const columns = [
    { key: 'code', header: 'Code', className: 'num text-xs', render: (p) => <span className="font-semibold text-slate-700">{p.code}</span> },
    { key: 'name', header: 'Product', render: (p) => p.name },
    { key: 'category', header: 'Category', render: (p) => <Badge tone="slate">{p.category}</Badge> },
    { key: 'interest_rate', header: 'Rate', align: 'right', className: 'num', render: (p) => `${Number(p.interest_rate)}%` },
    { key: 'min_balance', header: 'Min balance', align: 'right', className: 'num text-slate-600', render: (p) => formatMoney(p.min_balance, p.currency) },
    {
      key: 'fees', header: 'Fees', render: (p) => (
        <div className="flex flex-wrap gap-1">
          {(p.fees || []).map((f) => (
            <span key={f.fee_id} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-2xs rounded bg-slate-100 text-slate-600">
              {f.fee_type} {f.calc_method === 'percent' ? `${Number(f.amount)}%` : formatMoney(f.amount, p.currency)}
              <Can permission="admin"><button onClick={() => removeFee(p.product_id, f.fee_id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={11} /></button></Can>
            </span>
          ))}
          {!(p.fees || []).length && <span className="text-2xs text-slate-300">no fees</span>}
        </div>
      ),
    },
    {
      key: 'actions', header: '', align: 'right', render: (p) => (
        <Can permission="admin"><Button size="sm" variant="ghost" icon={Plus} onClick={() => setFeeFor(p)}>Fee</Button></Can>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Products & fees" description="Product catalog, interest rates and fee schedules"
        actions={
          <Can permission="admin">
            <Button variant="secondary" icon={Play} onClick={runFees}>Run monthly fees</Button>
            <Button icon={Plus} onClick={() => setCreating(true)}>New product</Button>
          </Can>
        } />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Products" value={loading ? '—' : products.length} icon={Package} accent="brand" />
        <StatCard label="With fees" value={loading ? '—' : products.filter((p) => (p.fees || []).length).length} icon={Percent} accent="warning" />
        <StatCard label="Categories" value={loading ? '—' : new Set(products.map((p) => p.category)).size} icon={Package} accent="slate" />
      </div>

      <Card>
        <DataTable columns={columns} rows={loading ? null : products} loading={loading} error={error} rowKey={(p) => p.product_id}
          empty={{ icon: Package, title: 'No products', description: 'Create a product to define its interest rate and fee schedule.' }} />
      </Card>

      {creating && <CreateProductModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />}
      {feeFor && <AddFeeModal product={feeFor} onClose={() => setFeeFor(null)} onDone={() => { setFeeFor(null); reload(); }} />}
    </div>
  );
}

function CreateProductModal({ onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ code: '', name: '', category: 'savings', currency: 'GHS', interest_rate: '', min_balance: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.code.trim() || !f.name.trim()) return toast.error('Code and name are required');
    setSaving(true);
    try {
      await ProductApi.create({ ...f, interest_rate: String(parseFloat(f.interest_rate) || 0), min_balance: String(parseFloat(f.min_balance) || 0) });
      toast.success('Product created'); onDone();
    } catch (err) { toast.error(err?.message || 'Could not create product'); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title="New product" size="md">
      <Card><CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code" required><Input value={f.code} onChange={set('code')} placeholder="SAV-GOLD" /></Field>
          <Field label="Category"><Select value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
          <Field label="Name" required className="col-span-2"><Input value={f.name} onChange={set('name')} placeholder="Gold Savings" /></Field>
          <Field label="Interest rate (% p.a.)"><Input value={f.interest_rate} onChange={set('interest_rate')} mono inputMode="decimal" /></Field>
          <Field label="Min balance"><Input value={f.min_balance} onChange={set('min_balance')} mono inputMode="decimal" /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={submit}>Create</Button></div>
      </CardBody></Card>
    </Modal>
  );
}

function AddFeeModal({ product, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ fee_type: 'maintenance', calc_method: 'flat', frequency: 'monthly', amount: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!(parseFloat(f.amount) > 0)) return toast.error('Enter a fee amount');
    setSaving(true);
    try { await ProductApi.addFee(product.product_id, { ...f, amount: String(parseFloat(f.amount)) }); toast.success('Fee added'); onDone(); }
    catch (err) { toast.error(err?.message || 'Could not add fee'); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Add fee — ${product.name}`} size="md">
      <Card><CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fee type"><Select value={f.fee_type} onChange={set('fee_type')}>{FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
          <Field label="Calc method"><Select value={f.calc_method} onChange={set('calc_method')}><option value="flat">Flat</option><option value="percent">Percent of balance</option></Select></Field>
          <Field label="Frequency"><Select value={f.frequency} onChange={set('frequency')}><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="per_txn">Per transaction</option></Select></Field>
          <Field label={f.calc_method === 'percent' ? 'Percent' : 'Amount'} required><Input value={f.amount} onChange={set('amount')} mono inputMode="decimal" /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={submit}>Add fee</Button></div>
      </CardBody></Card>
    </Modal>
  );
}
