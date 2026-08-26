import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Banknote, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CheckCircle2, Receipt, RotateCcw } from 'lucide-react';
import { TransactionApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { loadAllAccounts } from '../accounts/accountsData.js';
import { PageHeader, Card, CardHeader, Field, Select, Input, Button, StatusPill, useToast } from '../../components/ui/index.js';
import { formatMoney } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const OPS = [
  { key: 'deposit', label: 'Deposit', icon: ArrowDownLeft, tone: 'success', help: 'Cash in — credit a customer account' },
  { key: 'withdrawal', label: 'Withdrawal', icon: ArrowUpRight, tone: 'danger', help: 'Cash out — debit a customer account' },
  { key: 'transfer', label: 'Transfer', icon: ArrowLeftRight, tone: 'brand', help: 'Move funds between two accounts' },
];

export function TellerPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, loading, reload } = useAsync(() => loadAllAccounts(), []);
  const accounts = data || [];

  const [op, setOp] = useState('deposit');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(params.get('account') || '');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // When arriving with ?account=, default sensibly per operation.
  useEffect(() => {
    const preset = params.get('account');
    if (preset) { setTo(preset); setFrom(preset); }
  }, [params]);

  const acctById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.account_id, a])), [accounts]);
  const debitAcct = op === 'deposit' ? null : acctById[from];
  const creditAcct = op === 'withdrawal' ? null : acctById[to];
  const amt = parseFloat(amount || '0');

  const activeOp = OPS.find((o) => o.key === op);

  const preview = () => {
    const rows = [];
    if (debitAcct) rows.push({ acct: debitAcct, after: parseFloat(debitAcct.balance || 0) - amt, dir: 'debit' });
    if (creditAcct) rows.push({ acct: creditAcct, after: parseFloat(creditAcct.balance || 0) + amt, dir: 'credit' });
    return rows;
  };

  const reset = () => { setAmount(''); setDesc(''); setReceipt(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (op !== 'deposit' && !from) return toast.error('Select the source account');
    if (op !== 'withdrawal' && !to) return toast.error('Select the destination account');
    if (op === 'transfer' && from === to) return toast.error('Source and destination must differ');
    if (debitAcct && parseFloat(debitAcct.balance || 0) < amt) return toast.error('Insufficient funds in source account');

    const payload = { amount: String(amt.toFixed(2)), transaction_type: op, description: desc || activeOp.label };
    if (op !== 'deposit') payload.from_account_id = from;
    if (op !== 'withdrawal') payload.to_account_id = to;

    setBusy(true);
    try {
      const txn = await TransactionApi.create(payload);
      toast.success(`${activeOp.label} posted`, { title: formatMoney(amt, (creditAcct || debitAcct)?.currency) });
      setReceipt(txn);
      await reload();
    } catch (err) {
      toast.error(err?.message || 'Transaction failed');
    } finally { setBusy(false); }
  };

  const AccountOption = ({ a }) => (
    <option value={a.account_id}>{a.customer_name} · {a.account_type} · {a.currency} · {formatMoney(a.balance, a.currency)}</option>
  );

  return (
    <div>
      <PageHeader title="Teller" description="Cash operations — posted live to the double-entry ledger" />

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        {/* Operation form */}
        <Card>
          <CardHeader title="New transaction" icon={Banknote} />
          <div className="p-4">
            {/* Operation selector */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {OPS.map((o) => {
                const active = o.key === op;
                return (
                  <button key={o.key} onClick={() => { setOp(o.key); setReceipt(null); }}
                    className={cn('flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors',
                      active ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
                    <o.icon size={20} className={active ? 'text-brand-600' : 'text-slate-400'} />
                    <span className={cn('text-sm font-medium', active ? 'text-brand-700' : 'text-slate-600')}>{o.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {op !== 'deposit' && (
                <Field label="Source account (debit)" required hint={loading ? 'Loading accounts…' : undefined}>
                  <Select value={from} onChange={(e) => setFrom(e.target.value)}>
                    <option value="">Select account…</option>
                    {accounts.map((a) => <AccountOption key={a.account_id} a={a} />)}
                  </Select>
                </Field>
              )}
              {op !== 'withdrawal' && (
                <Field label="Destination account (credit)" required hint={loading ? 'Loading accounts…' : undefined}>
                  <Select value={to} onChange={(e) => setTo(e.target.value)}>
                    <option value="">Select account…</option>
                    {accounts.map((a) => <AccountOption key={a.account_id} a={a} />)}
                  </Select>
                </Field>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Amount" required className="sm:col-span-1">
                  <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" mono inputMode="decimal" />
                </Field>
                <Field label="Narrative" className="sm:col-span-2">
                  <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={`${activeOp.label} narrative (optional)`} />
                </Field>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" size="lg" icon={activeOp.icon} loading={busy}>Post {activeOp.label.toLowerCase()}</Button>
                <Button type="button" variant="ghost" icon={RotateCcw} onClick={reset}>Clear</Button>
                <span className="ml-auto text-xs text-slate-400">{activeOp.help}</span>
              </div>
            </form>
          </div>
        </Card>

        {/* Live preview / receipt */}
        <div className="space-y-4">
          {receipt ? (
            <Card className="animate-scale-in">
              <div className="p-5 text-center border-b border-slate-100">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success-50 text-success-600 mb-2"><CheckCircle2 size={26} /></span>
                <h3 className="text-base font-semibold text-slate-800">Transaction posted</h3>
                <div className="num text-2xl font-semibold text-slate-900 mt-1">{formatMoney(receipt.amount, receipt.currency)}</div>
                <div className="mt-2"><StatusPill status={receipt.status} /></div>
              </div>
              <div className="p-4 space-y-2.5 text-sm">
                <Row label="Type" value={<span className="capitalize">{receipt.transaction_type}</span>} />
                <Row label="Reference" value={<span className="num text-xs">{receipt.reference_number}</span>} />
                <Row label="Narrative" value={receipt.description || '—'} />
              </div>
              <div className="flex gap-2 p-4 border-t border-slate-100">
                <Button variant="secondary" className="flex-1" icon={Receipt} onClick={reset}>New transaction</Button>
                {(receipt.to_account_id || receipt.from_account_id) && (
                  <Button className="flex-1" onClick={() => navigate(`/accounts/${receipt.to_account_id || receipt.from_account_id}`)}>View account</Button>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Posting preview" icon={Receipt} />
              <div className="p-4">
                {preview().length === 0 || !amt ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Select accounts and enter an amount to preview the ledger impact.</p>
                ) : (
                  <div className="space-y-3">
                    {preview().map((r) => (
                      <div key={r.acct.account_id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">{r.acct.customer_name}</div>
                          <div className="num text-xs text-slate-400">{r.acct.account_id.slice(0, 14)}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cn('num text-sm font-semibold', r.dir === 'credit' ? 'text-success-700' : 'text-danger-600')}>
                            {r.dir === 'credit' ? '+' : '−'}{formatMoney(amt, r.acct.currency)}
                          </div>
                          <div className="num text-2xs text-slate-400">→ {formatMoney(r.after, r.acct.currency)}</div>
                        </div>
                      </div>
                    ))}
                    <p className="text-2xs text-slate-400 text-center pt-1">Double-entry: debits equal credits. Posted atomically.</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
