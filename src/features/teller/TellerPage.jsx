import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Banknote, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CheckCircle2, Receipt,
  RotateCcw, User, Calculator, Coins, Clock, Building2, CircleUser, ArrowRight,
} from 'lucide-react';
import { TransactionApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { usePagedList } from '../../lib/usePagedList.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { loadAllAccounts, asList } from '../accounts/accountsData.js';
import { PageHeader, Card, CardHeader, Field, Select, Input, Button, StatusPill, Badge, useToast, useConfirm } from '../../components/ui/index.js';
import { formatMoney } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const OPS = [
  { key: 'deposit', label: 'Deposit', icon: ArrowDownLeft, help: 'Cash in — credit a customer account' },
  { key: 'withdrawal', label: 'Withdrawal', icon: ArrowUpRight, help: 'Cash out — debit a customer account' },
  { key: 'transfer', label: 'Transfer', icon: ArrowLeftRight, help: 'Move funds between two accounts' },
];

const NOTES = {
  GHS: [200, 100, 50, 20, 10, 5, 2, 1],
  USD: [100, 50, 20, 10, 5, 1],
  EUR: [500, 200, 100, 50, 20, 10, 5],
  GBP: [50, 20, 10, 5],
  NGN: [1000, 500, 200, 100, 50, 20, 10],
};

export function TellerPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { data, loading, reload } = useAsync(() => loadAllAccounts(), []);
  const accounts = data || [];

  const [op, setOp] = useState('deposit');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(params.get('account') || '');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [denoms, setDenoms] = useState({});
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [journalTab, setJournalTab] = useState('session');

  // Teller session is server-derived and paginated: this teller's own transactions for today,
  // attributed by teller_id on the backend. Aggregates (count + cash) come over the full day.
  const tellerSession = usePagedList(
    (offset, limit) => TransactionApi.tellerToday({ limit, offset }).then((r) => ({
      items: r.transactions || [],
      total: r.count ?? 0,
      meta: { cashIn: Number(r.cash_in || 0), cashOut: Number(r.cash_out || 0) },
    })),
    [],
    { pageSize: 15 },
  );
  const cashIn = tellerSession.meta?.cashIn || 0;
  const cashOut = tellerSession.meta?.cashOut || 0;
  const sessionCount = tellerSession.total || 0;

  // Account history for the account currently in focus (destination, else source) — paginated.
  const focusId = to || from;
  const history = usePagedList(
    (offset, limit) => (focusId
      ? TransactionApi.byAccount(focusId, { limit, offset }).then((r) => ({ items: asList(r), total: null }))
      : Promise.resolve({ items: [], total: 0 })),
    [focusId],
    { pageSize: 12 },
  );

  useEffect(() => {
    const preset = params.get('account');
    if (preset) { setTo(preset); setFrom(preset); }
  }, [params]);

  const acctById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.account_id, a])), [accounts]);
  const debitAcct = op === 'deposit' ? null : acctById[from];
  const creditAcct = op === 'withdrawal' ? null : acctById[to];
  const cashAcct = op === 'deposit' ? creditAcct : debitAcct; // the customer side of a cash op
  const amt = parseFloat(amount || '0');
  const activeOp = OPS.find((o) => o.key === op);
  const isCash = op !== 'transfer';
  const ccy = cashAcct?.currency || 'GHS';
  const noteSet = NOTES[ccy] || NOTES.GHS;
  const denomTotal = noteSet.reduce((s, n) => s + n * (parseInt(denoms[n], 10) || 0), 0);

  const reset = () => { setAmount(''); setDesc(''); setDenoms({}); setReceipt(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (op !== 'deposit' && !from) return toast.error('Select the source account');
    if (op !== 'withdrawal' && !to) return toast.error('Select the destination account');
    if (op === 'transfer' && from === to) return toast.error('Source and destination must differ');
    if (debitAcct && parseFloat(debitAcct.balance || 0) < amt) return toast.error('Insufficient funds in source account');

    const party = cashAcct?.customer_name || (op === 'transfer' ? `${debitAcct?.customer_name || '—'} → ${creditAcct?.customer_name || '—'}` : '—');
    const ok = await confirm({
      title: `Confirm ${activeOp.label.toLowerCase()}`,
      message: `Post a ${op} of ${formatMoney(amt, ccy)} — ${party}? This is posted to the ledger immediately.`,
      confirmLabel: `Post ${activeOp.label.toLowerCase()}`,
      tone: 'warning',
    });
    if (!ok) return;

    const payload = { amount: String(amt.toFixed(2)), transaction_type: op, description: desc || activeOp.label };
    if (op !== 'deposit') payload.from_account_id = from;
    if (op !== 'withdrawal') payload.to_account_id = to;

    setBusy(true);
    try {
      const txn = await TransactionApi.create(payload);
      if (String(txn?.status).toLowerCase() === 'pending_approval') {
        toast.info(`${activeOp.label} submitted for approval`, { title: `${formatMoney(amt, ccy)} · awaiting a second officer` });
      } else {
        toast.success(`${activeOp.label} posted`, { title: formatMoney(amt, ccy) });
      }
      setReceipt({ ...txn, party: cashAcct?.customer_name });
      setAmount(''); setDesc(''); setDenoms({});
      await reload();
      tellerSession.reload();
      history.reload();
    } catch (err) {
      toast.error(err?.message || 'Transaction failed');
    } finally { setBusy(false); }
  };

  const AccountOption = ({ a }) => (
    <option value={a.account_id}>{a.customer_name} · {a.account_type} · {a.currency} · {formatMoney(a.balance, a.currency)}</option>
  );

  const net = cashIn - cashOut;

  // Enrich the server-derived journal with customer names from the loaded account list.
  const journalTxns = tellerSession.items.map((t) => ({
    ...t,
    party: acctById[t.to_account_id]?.customer_name || acctById[t.from_account_id]?.customer_name || null,
  }));

  return (
    <div>
      <PageHeader title="Teller" description="Cash operations — posted live to the double-entry ledger" />

      {/* Till status bar */}
      <div className="card px-4 py-3 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2 pr-6 border-r border-slate-100">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-600"><Building2 size={18} /></span>
          <div>
            <div className="text-sm font-semibold text-slate-800">Till 01 · Accra Main</div>
            <div className="text-2xs text-slate-400 flex items-center gap-1"><CircleUser size={11} /> {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}</div>
          </div>
        </div>
        <TillStat label="Session txns" value={sessionCount} />
        <TillStat label="Cash in" value={formatMoney(cashIn, 'GHS')} tone="success" />
        <TillStat label="Cash out" value={formatMoney(cashOut, 'GHS')} tone="danger" />
        <TillStat label="Net position" value={formatMoney(net, 'GHS')} tone={net >= 0 ? 'success' : 'danger'} />
        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
          <Clock size={13} /> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        {/* Operation panel */}
        <Card>
          <CardHeader title="New transaction" icon={Banknote} subtitle={activeOp.help} />
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2 mb-5">
              {OPS.map((o) => {
                const active = o.key === op;
                return (
                  <button key={o.key} type="button" onClick={() => { setOp(o.key); setReceipt(null); }}
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
                <div>
                  <Field label="Source account (debit)" required hint={loading ? 'Loading accounts…' : undefined}>
                    <Select value={from} onChange={(e) => setFrom(e.target.value)}>
                      <option value="">Select account…</option>
                      {accounts.map((a) => <AccountOption key={a.account_id} a={a} />)}
                    </Select>
                  </Field>
                  {debitAcct && <AccountChip a={debitAcct} />}
                </div>
              )}
              {op !== 'withdrawal' && (
                <div>
                  <Field label="Destination account (credit)" required hint={loading ? 'Loading accounts…' : undefined}>
                    <Select value={to} onChange={(e) => setTo(e.target.value)}>
                      <option value="">Select account…</option>
                      {accounts.map((a) => <AccountOption key={a.account_id} a={a} />)}
                    </Select>
                  </Field>
                  {creditAcct && <AccountChip a={creditAcct} />}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label={`Amount (${ccy})`} required>
                  <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" mono inputMode="decimal" />
                </Field>
                <Field label="Narrative" className="sm:col-span-2">
                  <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={`${activeOp.label} narrative (optional)`} />
                </Field>
              </div>

              {/* Cash denomination breakdown */}
              {isCash && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5"><Coins size={14} className="text-slate-400" /> Cash denominations ({ccy})</span>
                    <button type="button" onClick={() => setAmount(String(denomTotal.toFixed(2)))}
                      className="text-xs text-brand-600 hover:text-brand-700 disabled:text-slate-300" disabled={!denomTotal}>
                      Use total → {formatMoney(denomTotal, ccy)}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {noteSet.map((n) => (
                      <div key={n}>
                        <div className="text-2xs text-slate-400 text-center mb-0.5">{n}</div>
                        <input value={denoms[n] || ''} onChange={(e) => setDenoms((d) => ({ ...d, [n]: e.target.value.replace(/[^0-9]/g, '') }))}
                          placeholder="0" inputMode="numeric"
                          className="num w-full h-8 text-center text-sm border border-slate-300 rounded-md focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25" />
                      </div>
                    ))}
                  </div>
                  {denomTotal > 0 && (
                    <div className={cn('mt-2.5 text-xs flex items-center justify-between', denomTotal === amt ? 'text-success-600' : 'text-slate-400')}>
                      <span>Counted: <span className="num font-medium">{formatMoney(denomTotal, ccy)}</span></span>
                      {amt > 0 && (denomTotal === amt ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} /> matches amount</span> : <span>vs amount {formatMoney(amt, ccy)}</span>)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" size="lg" icon={activeOp.icon} loading={busy}>Post {activeOp.label.toLowerCase()}</Button>
                <Button type="button" variant="ghost" icon={RotateCcw} onClick={reset}>Clear</Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Right: preview/receipt + session journal */}
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
                <Row label="Customer" value={receipt.party || '—'} />
                <Row label="Reference" value={<span className="num text-xs">{receipt.reference_number}</span>} />
              </div>
              <div className="flex gap-2 p-4 border-t border-slate-100">
                <Button variant="secondary" className="flex-1" icon={Receipt} onClick={() => setReceipt(null)}>New transaction</Button>
                {(receipt.to_account_id || receipt.from_account_id) && (
                  <Button className="flex-1" onClick={() => navigate(`/accounts/${receipt.to_account_id || receipt.from_account_id}`)}>View account</Button>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Posting preview" icon={Calculator} />
              <div className="p-4">
                {!amt || (!debitAcct && !creditAcct) ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Select account(s) and enter an amount to preview the ledger impact.</p>
                ) : (
                  <div className="space-y-3">
                    {debitAcct && <PreviewRow a={debitAcct} amt={amt} dir="debit" />}
                    {creditAcct && <PreviewRow a={creditAcct} amt={amt} dir="credit" />}
                    <p className="text-2xs text-slate-400 text-center pt-1">Double-entry: debits equal credits. Posted atomically to the ledger.</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Journal: session + account history */}
          <Card>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                <button type="button" onClick={() => setJournalTab('session')}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', journalTab === 'session' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  My session ({sessionCount})
                </button>
                <button type="button" onClick={() => setJournalTab('account')}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', journalTab === 'account' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  Account history
                </button>
              </div>
              {journalTab === 'account' && acctById[focusId] && (
                <span className="text-2xs text-slate-400 truncate max-w-[120px]">{acctById[focusId].customer_name}</span>
              )}
            </div>
            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto scroll-thin">
              {journalTab === 'session' ? (
                tellerSession.loading ? (
                  <div className="p-5 text-sm text-slate-400 text-center">Loading your session…</div>
                ) : journalTxns.length === 0 ? (
                  <div className="p-5 text-sm text-slate-400 text-center">No transactions posted by you today.</div>
                ) : (
                  <>
                    {journalTxns.map((t) => {
                      const o = OPS.find((x) => x.key === t.transaction_type) || OPS[0];
                      return (
                        <div key={t.transaction_id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                            t.transaction_type === 'deposit' ? 'bg-success-50 text-success-600' : t.transaction_type === 'withdrawal' ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-600')}>
                            <o.icon size={15} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-800 capitalize truncate">{t.transaction_type} · {t.party || '—'}</div>
                            <div className="num text-2xs text-slate-400 truncate">{t.reference_number}</div>
                          </div>
                          <div className="num text-sm font-semibold text-slate-800">{formatMoney(t.amount, t.currency)}</div>
                        </div>
                      );
                    })}
                    {tellerSession.hasMore && (
                      <button type="button" onClick={tellerSession.loadMore} disabled={tellerSession.loadingMore}
                        className="w-full py-2.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:text-slate-300">
                        {tellerSession.loadingMore ? 'Loading…' : `Load more · ${sessionCount - journalTxns.length} more`}
                      </button>
                    )}
                  </>
                )
              ) : (
                !focusId ? (
                  <div className="p-5 text-sm text-slate-400 text-center">Select an account to view its transaction history.</div>
                ) : history.loading ? (
                  <div className="p-5 text-sm text-slate-400 text-center">Loading history…</div>
                ) : history.items.length === 0 ? (
                  <div className="p-5 text-sm text-slate-400 text-center">No transactions on this account yet.</div>
                ) : (
                  <>
                    {history.items.map((t) => {
                      const credit = t.to_account_id === focusId;
                      return (
                        <div key={t.transaction_id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', credit ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600')}>
                            {credit ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-800 capitalize truncate">{t.transaction_type}</div>
                            <div className="num text-2xs text-slate-400 truncate">{t.description || t.reference_number}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={cn('num text-sm font-semibold', credit ? 'text-success-700' : 'text-slate-800')}>{credit ? '+' : '−'}{formatMoney(t.amount, t.currency)}</div>
                            <StatusPill status={t.status} />
                          </div>
                        </div>
                      );
                    })}
                    {history.hasMore && (
                      <button type="button" onClick={history.loadMore} disabled={history.loadingMore}
                        className="w-full py-2.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:text-slate-300">
                        {history.loadingMore ? 'Loading…' : 'Load more'}
                      </button>
                    )}
                  </>
                )
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TillStat({ label, value, tone }) {
  const color = tone === 'success' ? 'text-success-600' : tone === 'danger' ? 'text-danger-600' : 'text-slate-800';
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cn('num text-sm font-semibold', color)}>{value}</div>
    </div>
  );
}

function AccountChip({ a }) {
  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 shrink-0"><User size={15} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-800 truncate">{a.customer_name}</div>
        <div className="num text-2xs text-slate-400 truncate">{a.account_id.slice(0, 16)} · {a.account_type}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="num text-sm font-semibold text-slate-800">{formatMoney(a.balance, a.currency)}</div>
        <StatusPill status={a.status} />
      </div>
    </div>
  );
}

function PreviewRow({ a, amt, dir }) {
  const after = dir === 'credit' ? parseFloat(a.balance || 0) + amt : parseFloat(a.balance || 0) - amt;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{a.customer_name}</div>
        <div className="num text-xs text-slate-400">{a.account_id.slice(0, 14)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={cn('num text-sm font-semibold', dir === 'credit' ? 'text-success-700' : 'text-danger-600')}>
          {dir === 'credit' ? '+' : '−'}{formatMoney(amt, a.currency)}
        </div>
        <div className="num text-2xs text-slate-400 flex items-center gap-1 justify-end">{formatMoney(a.balance, a.currency)} <ArrowRight size={10} /> {formatMoney(after, a.currency)}</div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-xs uppercase tracking-wide text-slate-400">{label}</span><span className="text-slate-700">{value}</span></div>;
}
