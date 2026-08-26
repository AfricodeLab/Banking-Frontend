import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, Send, UserPlus, Trash2, User, Building2, CheckCircle2,
  ArrowUpRight, Users, Wallet, Repeat,
} from 'lucide-react';
import { TransactionApi, BeneficiaryApi, StandingOrderApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { loadAllAccounts, asList } from '../accounts/accountsData.js';
import { PageHeader, Card, CardHeader, Field, Select, Input, Button, Badge, StatusPill, Modal, EmptyState, DataTable, useToast, useConfirm } from '../../components/ui/index.js';
import { formatMoney, formatDateTime, formatDate, initials, maskCard } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

export function PaymentsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const accountsQ = useAsync(() => loadAllAccounts(), []);
  const accounts = accountsQ.data || [];
  const acctById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.account_id, a])), [accounts]);

  const [fromId, setFromId] = useState('');
  const [benId, setBenId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const fromAcct = acctById[fromId];
  const ownerId = fromAcct?.customer_id;

  const beneficiaries = useAsync(() => (ownerId ? BeneficiaryApi.list(ownerId).then(asList) : Promise.resolve([])), [ownerId]);
  const recent = useAsync(() => (fromId ? TransactionApi.byAccount(fromId).then(asList) : Promise.resolve([])), [fromId]);
  const benList = beneficiaries.data || [];
  const benById = useMemo(() => Object.fromEntries(benList.map((b) => [b.beneficiary_id, b])), [benList]);
  const selectedBen = benById[benId];
  const amt = parseFloat(amount || '0');

  const benLabel = (b) => acctById[b.account_number]?.customer_name || b.name;

  const send = async (e) => {
    e.preventDefault();
    if (!fromId) return toast.error('Select the source account');
    if (!selectedBen) return toast.error('Select a beneficiary');
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (selectedBen.type === 'external') return toast.error('External transfers require an interbank rail (not connected in this environment).');
    if (selectedBen.account_number === fromId) return toast.error('Source and destination must differ');
    if (parseFloat(fromAcct.balance || 0) < amt) return toast.error('Insufficient funds');

    const ok = await confirm({
      title: 'Confirm payment',
      message: `Send ${formatMoney(amt, fromAcct.currency)} from ${fromAcct.customer_name}'s ${fromAcct.account_type} account to ${selectedBen.name}? This posts to the ledger and cannot be reversed here.`,
      confirmLabel: 'Send payment',
      tone: 'warning',
    });
    if (!ok) return;

    setBusy(true);
    try {
      const txn = await TransactionApi.create({
        from_account_id: fromId,
        to_account_id: selectedBen.account_number,
        amount: String(amt.toFixed(2)),
        transaction_type: 'transfer',
        description: desc || `Payment to ${selectedBen.name}`,
      });
      toast.success('Payment sent', { title: `${formatMoney(amt, fromAcct.currency)} → ${selectedBen.name}` });
      setReceipt({ ...txn, beneficiary: selectedBen });
      setAmount(''); setDesc('');
      accountsQ.reload(); recent.reload();
    } catch (err) {
      toast.error(err?.message || 'Payment failed');
    } finally { setBusy(false); }
  };

  const removeBen = async (b) => {
    const ok = await confirm({ title: 'Remove beneficiary?', message: `Remove ${b.name} from saved beneficiaries?`, confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    try { await BeneficiaryApi.remove(b.beneficiary_id); toast.success('Beneficiary removed'); if (benId === b.beneficiary_id) setBenId(''); beneficiaries.reload(); }
    catch (err) { toast.error(err?.message || 'Could not remove'); }
  };

  const transfers = (recent.data || []).filter((t) => t.transaction_type === 'transfer').slice(0, 8);

  return (
    <div>
      <PageHeader title="Payments & Transfers" description="Send money to saved beneficiaries" />

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-4">
        {/* Send money */}
        <Card>
          <CardHeader title="Send money" icon={Send} />
          <div className="p-4">
            {receipt ? (
              <div className="text-center py-6 animate-scale-in">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success-50 text-success-600 mb-3"><CheckCircle2 size={30} /></span>
                <div className="num text-2xl font-semibold text-slate-900">{formatMoney(receipt.amount, receipt.currency)}</div>
                <div className="text-sm text-slate-500 mt-1">sent to <span className="font-medium text-slate-700">{receipt.beneficiary?.name}</span></div>
                <div className="num text-xs text-slate-400 mt-1">{receipt.reference_number}</div>
                <div className="flex items-center justify-center gap-2 mt-5">
                  <Button variant="secondary" onClick={() => setReceipt(null)}>Send another</Button>
                  <Button onClick={() => navigate(`/accounts/${fromId}`)}>View account</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={send} className="space-y-4">
                <Field label="From account" required>
                  <Select value={fromId} onChange={(e) => { setFromId(e.target.value); setBenId(''); }}>
                    <option value="">Select account…</option>
                    {accounts.map((a) => <option key={a.account_id} value={a.account_id}>{a.customer_name} · {a.account_type} · {a.currency} · {formatMoney(a.balance, a.currency)}</option>)}
                  </Select>
                </Field>

                {fromId && (
                  <Field label="Beneficiary" required
                    hint={beneficiaries.loading ? 'Loading…' : (!benList.length ? 'No saved beneficiaries — add one on the right.' : undefined)}>
                    <Select value={benId} onChange={(e) => setBenId(e.target.value)}>
                      <option value="">Select beneficiary…</option>
                      {benList.map((b) => <option key={b.beneficiary_id} value={b.beneficiary_id}>{b.name}{b.nickname ? ` (${b.nickname})` : ''} · {b.type}</option>)}
                    </Select>
                  </Field>
                )}

                {selectedBen && (
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 shrink-0"><User size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{selectedBen.name}</div>
                      <div className="num text-2xs text-slate-400 truncate">{selectedBen.type === 'internal' ? `${benLabel(selectedBen)} · ${selectedBen.account_number.slice(0, 12)}` : `${selectedBen.bank_name || 'External'} · ${selectedBen.account_number}`}</div>
                    </div>
                    <Badge tone={selectedBen.type === 'internal' ? 'brand' : 'warning'}>{selectedBen.type}</Badge>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label={`Amount (${fromAcct?.currency || 'GHS'})`} required>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" mono inputMode="decimal" />
                  </Field>
                  <Field label="Narrative" className="sm:col-span-2">
                    <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Payment reference (optional)" />
                  </Field>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button type="submit" size="lg" icon={Send} loading={busy} disabled={!fromId || !benId}>Send payment</Button>
                  {fromAcct && <span className="ml-auto text-xs text-slate-400">Available <span className="num">{formatMoney(fromAcct.balance, fromAcct.currency)}</span></span>}
                </div>
              </form>
            )}
          </div>
        </Card>

        {/* Beneficiaries + recent */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Beneficiaries" icon={Users}
              actions={<Button size="sm" icon={UserPlus} disabled={!ownerId} onClick={() => setAddOpen(true)}>Add</Button>} />
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto scroll-thin">
              {!fromId && <div className="p-5 text-sm text-slate-400 text-center">Select a source account to see its beneficiaries.</div>}
              {fromId && beneficiaries.loading && <div className="p-5 text-sm text-slate-400 text-center">Loading…</div>}
              {fromId && !beneficiaries.loading && benList.length === 0 && (
                <EmptyState icon={Users} title="No beneficiaries" description="Add a payee to send money quickly." action={<Button size="sm" icon={UserPlus} onClick={() => setAddOpen(true)}>Add beneficiary</Button>} />
              )}
              {benList.map((b) => (
                <div key={b.beneficiary_id} className={cn('flex items-center gap-3 px-4 py-2.5 group cursor-pointer', benId === b.beneficiary_id && 'bg-brand-50')} onClick={() => setBenId(b.beneficiary_id)}>
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 text-xs font-semibold shrink-0">{initials(b.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{b.name}{b.nickname ? <span className="text-slate-400 font-normal"> · {b.nickname}</span> : ''}</div>
                    <div className="num text-2xs text-slate-400 truncate">{b.type === 'internal' ? maskCard(b.account_number) : `${b.bank_name || 'External'} · ${b.account_number}`}</div>
                  </div>
                  <Badge tone={b.type === 'internal' ? 'brand' : 'warning'}>{b.type}</Badge>
                  <button onClick={(e) => { e.stopPropagation(); removeBen(b); }} className="text-slate-300 hover:text-danger-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent transfers" icon={ArrowLeftRight} />
            <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto scroll-thin">
              {!fromId && <div className="p-5 text-sm text-slate-400 text-center">Select an account to see recent transfers.</div>}
              {fromId && recent.loading && <div className="p-5 text-sm text-slate-400 text-center">Loading…</div>}
              {fromId && !recent.loading && transfers.length === 0 && <div className="p-5 text-sm text-slate-400 text-center">No transfers on this account yet.</div>}
              {transfers.map((t) => {
                const out = t.from_account_id === fromId;
                return (
                  <div key={t.transaction_id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', out ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600')}><ArrowUpRight size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{t.description || 'Transfer'}</div>
                      <div className="num text-2xs text-slate-400 truncate">{formatDateTime(t.transaction_date)}</div>
                    </div>
                    <div className="num text-sm font-semibold text-slate-800">{out ? '−' : '+'}{formatMoney(t.amount, t.currency)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <StandingOrdersCard accounts={accounts} acctById={acctById} />
      </div>

      <AddBeneficiaryModal open={addOpen} onClose={() => setAddOpen(false)} ownerId={ownerId} accounts={accounts} excludeId={fromId} onAdded={() => beneficiaries.reload()} />
    </div>
  );
}

function StandingOrdersCard({ accounts, acctById }) {
  const toast = useToast();
  const confirm = useConfirm();
  const orders = useAsync(() => StandingOrderApi.list().then(asList), []);
  const [form, setForm] = useState({ from_account_id: '', to_account_id: '', amount: '', frequency: 'monthly', reference: '', start_date: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const list = orders.data || [];

  const create = async () => {
    if (!form.from_account_id || !form.to_account_id) return toast.error('Select both accounts');
    if (form.from_account_id === form.to_account_id) return toast.error('Accounts must differ');
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    setBusy(true);
    try {
      await StandingOrderApi.create({ ...form, amount: amt, currency: acctById[form.from_account_id]?.currency || 'GHS' });
      toast.success('Standing order created');
      setForm((f) => ({ ...f, amount: '', reference: '' }));
      orders.reload();
    } catch (err) { toast.error(err?.message || 'Could not create'); }
    finally { setBusy(false); }
  };

  const toggle = async (o) => {
    try { await (o.status === 'paused' ? StandingOrderApi.resume(o.order_id) : StandingOrderApi.pause(o.order_id)); orders.reload(); }
    catch (err) { toast.error(err?.message || 'Could not update'); }
  };
  const cancel = async (o) => {
    const ok = await confirm({ title: 'Cancel standing order?', message: `Stop the recurring ${o.frequency} transfer of ${formatMoney(o.amount, o.currency)}?`, confirmLabel: 'Cancel order', tone: 'danger' });
    if (!ok) return;
    try { await StandingOrderApi.cancel(o.order_id); toast.success('Standing order cancelled'); orders.reload(); }
    catch (err) { toast.error(err?.message || 'Could not cancel'); }
  };

  const name = (id) => acctById[id]?.customer_name || (id || '').slice(0, 10);

  return (
    <Card>
      <CardHeader title="Standing orders" icon={Repeat} subtitle="Recurring transfers executed automatically" />
      <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto_auto_1fr_auto] items-end gap-3 border-b border-slate-100">
        <Field label="From"><Select value={form.from_account_id} onChange={set('from_account_id')}><option value="">Account…</option>{accounts.map((a) => <option key={a.account_id} value={a.account_id}>{a.customer_name} · {a.currency}</option>)}</Select></Field>
        <Field label="To"><Select value={form.to_account_id} onChange={set('to_account_id')}><option value="">Account…</option>{accounts.map((a) => <option key={a.account_id} value={a.account_id}>{a.customer_name} · {a.currency}</option>)}</Select></Field>
        <Field label="Amount"><Input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, '') }))} mono className="w-28" placeholder="0.00" /></Field>
        <Field label="Frequency"><Select value={form.frequency} onChange={set('frequency')} className="w-28"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></Select></Field>
        <Field label="Reference"><Input value={form.reference} onChange={set('reference')} placeholder="e.g. Rent" /></Field>
        <Button icon={Repeat} loading={busy} onClick={create}>Create</Button>
      </div>
      <DataTable
        columns={[
          { key: 'route', header: 'From → To', render: (o) => <span className="text-slate-700">{name(o.from_account_id)} <span className="text-slate-400">→</span> {name(o.to_account_id)}</span> },
          { key: 'amount', header: 'Amount', align: 'right', className: 'num font-medium text-slate-800', render: (o) => formatMoney(o.amount, o.currency) },
          { key: 'frequency', header: 'Frequency', render: (o) => <Badge tone="neutral">{o.frequency}</Badge> },
          { key: 'next_run', header: 'Next run', render: (o) => <span className="text-slate-500 text-xs">{o.status === 'active' ? formatDate(o.next_run) : '—'}</span> },
          { key: 'run_count', header: 'Runs', align: 'right', className: 'num text-slate-500', render: (o) => o.run_count },
          { key: 'status', header: 'Status', render: (o) => <StatusPill status={o.status} /> },
          {
            key: 'actions', header: '', align: 'right',
            render: (o) => o.status === 'cancelled' ? null : (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="xs" variant="ghost" onClick={() => toggle(o)}>{o.status === 'paused' ? 'Resume' : 'Pause'}</Button>
                <Button size="xs" variant="ghost" onClick={() => cancel(o)}>Cancel</Button>
              </div>
            ),
          },
        ]}
        rows={orders.loading ? null : list} loading={orders.loading} rowKey={(o) => o.order_id} pageSize={6}
        empty={{ icon: Repeat, title: 'No standing orders', description: 'Set up a recurring transfer above.' }}
      />
    </Card>
  );
}

function AddBeneficiaryModal({ open, onClose, ownerId, accounts, excludeId, onAdded }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', nickname: '', type: 'internal', account_id: '', account_number: '', bank_name: '', currency: 'GHS' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!ownerId) return toast.error('Select a source account first');
    if (!form.name.trim()) return toast.error('Enter a name');
    const account_number = form.type === 'internal' ? form.account_id : form.account_number.trim();
    if (!account_number) return toast.error(form.type === 'internal' ? 'Select the beneficiary account' : 'Enter the account number');
    setBusy(true);
    try {
      await BeneficiaryApi.create({
        owner_customer_id: ownerId, name: form.name.trim(), nickname: form.nickname.trim(),
        account_number, bank_name: form.type === 'external' ? form.bank_name.trim() : 'AfriCore',
        currency: form.currency, type: form.type,
      });
      toast.success('Beneficiary added', { title: form.name });
      onAdded?.(); onClose();
      setForm({ name: '', nickname: '', type: 'internal', account_id: '', account_number: '', bank_name: '', currency: 'GHS' });
    } catch (err) { toast.error(err?.message || 'Could not add beneficiary'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add beneficiary" subtitle="Save a payee for quick transfers"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={UserPlus} loading={busy} onClick={submit}>Save beneficiary</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" required><Input value={form.name} onChange={set('name')} placeholder="Beneficiary name" /></Field>
          <Field label="Nickname"><Input value={form.nickname} onChange={set('nickname')} placeholder="e.g. Rent" /></Field>
        </div>
        <Field label="Beneficiary type">
          <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5 h-9">
            {[{ v: 'internal', l: 'Internal (AfriCore)' }, { v: 'external', l: 'External bank' }].map((o) => (
              <button key={o.v} type="button" onClick={() => setForm((f) => ({ ...f, type: o.v }))}
                className={cn('flex-1 text-xs font-medium rounded px-2 py-1 transition-colors', form.type === o.v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {o.l}
              </button>
            ))}
          </div>
        </Field>
        {form.type === 'internal' ? (
          <Field label="Beneficiary account" required>
            <Select value={form.account_id} onChange={set('account_id')}>
              <option value="">Select account…</option>
              {accounts.filter((a) => a.account_id !== excludeId).map((a) => <option key={a.account_id} value={a.account_id}>{a.customer_name} · {a.account_type} · {a.currency}</option>)}
            </Select>
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Account number" required><Input value={form.account_number} onChange={set('account_number')} mono placeholder="0000000000" /></Field>
            <Field label="Bank"><Input value={form.bank_name} onChange={set('bank_name')} placeholder="Bank name" /></Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
