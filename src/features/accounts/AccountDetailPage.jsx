import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Receipt, CreditCard, Banknote, Snowflake, Power, ArrowDownLeft, ArrowUpRight, User, FileText, Gauge, Pencil, Users, Trash2 } from 'lucide-react';
import { AccountApi, TransactionApi, CustomerApi, OverdraftApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { Card, CardHeader, Tabs, StatusPill, Badge, Button, DataTable, Spinner, Modal, Field, Input, useToast, useConfirm } from '../../components/ui/index.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { formatMoney, formatDateTime, formatDate, initials } from '../../lib/format.js';
import { asList } from './accountsData.js';
import { useLeafCrumb } from '../../components/layout/Breadcrumbs.jsx';

export function AccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('transactions');
  const [busy, setBusy] = useState(false);

  const account = useAsync(() => AccountApi.get(id), [id]);
  const txns = useAsync(() => TransactionApi.byAccount(id).catch(() => []), [id]);
  const cards = useAsync(() => AccountApi.cards(id).catch(() => []), [id]);

  const a = account.data;
  const owner = useAsync(
    () => (a?.customer_id ? CustomerApi.get(a.customer_id).catch(() => null) : Promise.resolve(null)),
    [a?.customer_id],
  );
  useLeafCrumb(a ? `${a.account_type} ••${(a.account_id || '').slice(-4)}` : null);

  const changeStatus = async (status) => {
    const freezing = status === 'frozen';
    const ok = await confirm({
      title: freezing ? 'Freeze account?' : 'Activate account?',
      message: freezing
        ? 'Freezing blocks all debits and credits on this account until it is reactivated.'
        : 'Reactivate this account so it can transact again?',
      confirmLabel: freezing ? 'Freeze' : 'Activate',
      tone: freezing ? 'danger' : 'primary',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await AccountApi.updateStatus(id, status);
      toast.success(`Account ${status}`);
      account.reload();
    } catch (err) {
      toast.error(err?.message || 'Could not update status');
    } finally { setBusy(false); }
  };

  if (account.loading) return <div className="flex items-center justify-center gap-2 py-24 text-slate-400"><Spinner size={20} /> Loading account…</div>;
  if (account.error) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <p className="text-danger-600 font-medium">Could not load account</p>
      <p className="text-sm text-slate-500 mt-1">{account.error.message}</p>
      <Button variant="secondary" className="mt-4" icon={ArrowLeft} onClick={() => navigate('/accounts')}>Back to accounts</Button>
    </div>
  );

  const txList = asList(txns.data);
  const cardList = asList(cards.data);
  const isActive = String(a.status).toLowerCase() === 'active';

  const txColumns = [
    {
      key: 'transaction_type', header: 'Type',
      render: (t) => {
        const credit = t.to_account_id === id;
        return (
          <div className="flex items-center gap-2">
            <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${credit ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'}`}>
              {credit ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
            </span>
            <span className="capitalize font-medium text-slate-700">{t.transaction_type}</span>
          </div>
        );
      },
    },
    { key: 'description', header: 'Description', render: (t) => <span className="text-slate-500">{t.description || '—'}</span> },
    { key: 'reference_number', header: 'Reference', className: 'num text-xs text-slate-400', render: (t) => t.reference_number || '—' },
    { key: 'transaction_date', header: 'Date', render: (t) => <span className="text-slate-500">{formatDateTime(t.transaction_date)}</span> },
    { key: 'status', header: 'Status', render: (t) => <StatusPill status={t.status} /> },
    {
      key: 'amount', header: 'Amount', align: 'right', className: 'num font-semibold',
      render: (t) => {
        const credit = t.to_account_id === id;
        return <span className={credit ? 'text-success-700' : 'text-slate-800'}>{credit ? '+' : '−'}{formatMoney(t.amount, t.currency).replace(/^[^\d]*/, (m) => m)}</span>;
      },
    },
  ];

  return (
    <div>
      <button onClick={() => navigate('/accounts')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={15} /> Back to accounts
      </button>

      {/* Balance header */}
      <div className="card p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 text-white shrink-0"><Wallet size={24} /></span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm capitalize font-medium text-slate-700">{a.account_type} account</span>
                <Badge tone="neutral">{a.currency || 'USD'}</Badge>
                <StatusPill status={a.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="num text-xs text-slate-400">{a.account_id}</span>
                {owner.data && (
                  <Link to={`/customers/${a.customer_id}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                    <User size={12} /> {owner.data.name}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="lg:text-right">
            <div className="text-2xs uppercase tracking-wide text-slate-400">Available balance</div>
            <div className="num text-3xl font-semibold text-slate-900 leading-tight">{formatMoney(a.balance, a.currency)}</div>
          </div>
          <div className="flex items-center gap-2 lg:pl-5 lg:border-l border-slate-100">
            <Button variant="secondary" icon={FileText} onClick={() => navigate(`/accounts/${a.account_id}/statement`)}>Statement</Button>
            <Button icon={Banknote} onClick={() => navigate(`/teller?account=${a.account_id}`)}>Teller</Button>
            {isActive ? (
              <Button variant="secondary" icon={Snowflake} loading={busy} onClick={() => changeStatus('frozen')}>Freeze</Button>
            ) : (
              <Button variant="secondary" icon={Power} loading={busy} onClick={() => changeStatus('active')}>Activate</Button>
            )}
          </div>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'transactions', label: 'Transactions', count: txList.length },
          { value: 'cards', label: 'Cards', count: cardList.length },
          { value: 'holders', label: 'Holders' },
          { value: 'limits', label: 'Limits' },
          { value: 'details', label: 'Details' },
        ]}
        className="mb-4"
      />

      {tab === 'transactions' && (
        <Card>
          <CardHeader title="Transaction history" icon={Receipt} actions={<Button size="sm" icon={Banknote} onClick={() => navigate(`/teller?account=${a.account_id}`)}>New transaction</Button>} />
          <DataTable columns={txColumns} rows={txns.loading ? null : txList} loading={txns.loading}
            rowKey={(t) => t.transaction_id}
            empty={{ icon: Receipt, title: 'No transactions', description: 'Post a deposit or withdrawal from the Teller.' }} />
        </Card>
      )}

      {tab === 'cards' && (
        <Card>
          <CardHeader title="Linked cards" icon={CreditCard} />
          <DataTable
            columns={[
              { key: 'card_number', header: 'Card', className: 'num', render: (c) => c.card_number || '•••• ••••' },
              { key: 'card_type', header: 'Type', render: (c) => <span className="capitalize">{c.card_type}</span> },
              { key: 'status', header: 'Status', render: (c) => <StatusPill status={c.status} /> },
              { key: 'daily_limit', header: 'Daily limit', align: 'right', className: 'num', render: (c) => formatMoney(c.daily_limit, a.currency) },
            ]}
            rows={cards.loading ? null : cardList} loading={cards.loading} rowKey={(c) => c.card_id}
            empty={{ icon: CreditCard, title: 'No cards issued', description: 'This account has no linked cards.' }} />
        </Card>
      )}

      {tab === 'holders' && <AccountHolders accountId={id} />}

      {tab === 'limits' && (
        <div className="space-y-4">
          <WithdrawalLimits accountId={id} currency={a.currency} />
          <OverdraftConfig account={a} onSaved={() => account.reload()} />
        </div>
      )}

      {tab === 'details' && (
        <Card>
          <CardHeader title="Account details" icon={Wallet} />
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <Detail label="Account number" value={a.account_id} mono />
            <Detail label="Type" value={<span className="capitalize">{a.account_type}</span>} />
            <Detail label="Currency" value={a.currency || 'USD'} />
            <Detail label="Status" value={<StatusPill status={a.status} />} />
            <Detail label="Customer ID" value={(a.customer_id || '').slice(0, 12)} mono />
            <Detail label="Branch ID" value={(a.branch_id || '').slice(0, 12)} mono />
            <Detail label="Opened" value={formatDate(a.created_at)} />
            <Detail label="Balance" value={formatMoney(a.balance, a.currency)} mono />
          </div>
        </Card>
      )}
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-slate-700 mt-0.5 ${mono ? 'num' : ''}`}>{value}</div>
    </div>
  );
}

// WithdrawalLimits shows an account's per-transaction / daily / monthly caps with usage,
// and lets authorised staff adjust them. "0" means no limit.
function WithdrawalLimits({ accountId, currency }) {
  const { can } = useAuth();
  const limits = useAsync(() => AccountApi.limits(accountId), [accountId]);
  const [editing, setEditing] = useState(false);
  const d = limits.data;
  const editable = can('update_account');

  const fmtLimit = (v) => (Number(v) > 0 ? formatMoney(v, currency) : 'No limit');

  return (
    <Card>
      <CardHeader title="Withdrawal limits" icon={Gauge} subtitle="Caps on outgoing withdrawals & transfers"
        actions={editable ? <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit limits</Button> : null} />
      {limits.loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm p-6"><Spinner size={16} /> Loading…</div>
      ) : limits.error ? (
        <div className="p-6 text-sm text-danger-600">{String(limits.error.message)}</div>
      ) : (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LimitTile label="Per transaction" value={fmtLimit(d.withdrawal_limit_per_txn)} />
          <LimitTile label="Daily" value={fmtLimit(d.withdrawal_limit_daily)}
            used={Number(d.withdrawal_limit_daily) > 0 ? `${formatMoney(d.used_today, currency)} used · ${formatMoney(d.remaining_today, currency)} left today` : null} />
          <LimitTile label="Monthly" value={fmtLimit(d.withdrawal_limit_monthly)}
            used={Number(d.withdrawal_limit_monthly) > 0 ? `${formatMoney(d.used_month, currency)} used · ${formatMoney(d.remaining_month, currency)} left this month` : null} />
        </div>
      )}

      {editing && d && (
        <EditLimitsModal accountId={accountId} current={d} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); limits.reload(); }} />
      )}
    </Card>
  );
}

function LimitTile({ label, value, used }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3.5">
      <div className="text-2xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="num text-lg font-semibold text-slate-900 mt-1">{value}</div>
      {used && <div className="text-xs text-slate-400 mt-1">{used}</div>}
    </div>
  );
}

function EditLimitsModal({ accountId, current, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    per_txn: String(current.withdrawal_limit_per_txn || 0),
    daily: String(current.withdrawal_limit_daily || 0),
    monthly: String(current.withdrawal_limit_monthly || 0),
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const nums = [form.per_txn, form.daily, form.monthly].map((v) => parseFloat(v || '0'));
    if (nums.some((n) => Number.isNaN(n) || n < 0)) return toast.error('Enter valid, non-negative amounts');
    setBusy(true);
    try {
      await AccountApi.setLimits(accountId, {
        withdrawal_limit_per_txn: String(nums[0].toFixed(2)),
        withdrawal_limit_daily: String(nums[1].toFixed(2)),
        withdrawal_limit_monthly: String(nums[2].toFixed(2)),
      });
      toast.success('Withdrawal limits updated');
      onSaved?.();
    } catch (err) { toast.error(err?.message || 'Could not update limits'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Edit withdrawal limits" subtitle="Enter 0 for no limit"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Save limits</Button></>}>
      <div className="space-y-4">
        <Field label="Per-transaction limit" hint="Maximum for a single withdrawal or transfer.">
          <Input type="number" step="0.01" min="0" value={form.per_txn} onChange={set('per_txn')} mono />
        </Field>
        <Field label="Daily limit" hint="Maximum total withdrawn per day.">
          <Input type="number" step="0.01" min="0" value={form.daily} onChange={set('daily')} mono />
        </Field>
        <Field label="Monthly limit" hint="Maximum total withdrawn per calendar month.">
          <Input type="number" step="0.01" min="0" value={form.monthly} onChange={set('monthly')} mono />
        </Field>
      </div>
    </Modal>
  );
}

// AccountHolders — primary owner + joint/authorized holders (joint accounts).
function AccountHolders({ accountId }) {
  const toast = useToast();
  const confirm = useConfirm();
  const q = useAsync(() => AccountApi.holders(accountId).then((r) => r.holders || []), [accountId]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('joint');
  const results = useAsync(() => (query.trim().length >= 2 ? CustomerApi.list({ limit: 8 }).then(asList) : Promise.resolve([])), [query]);

  const add = async (customerId) => {
    try { await AccountApi.addHolder(accountId, { customer_id: customerId, role }); toast.success('Holder added'); setQuery(''); q.reload(); }
    catch (err) { toast.error(err?.message || 'Could not add holder'); }
  };
  const remove = async (h) => {
    const ok = await confirm({ title: 'Remove holder?', message: `Remove ${h.customer_name || 'this holder'} from the account?`, confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    try { await AccountApi.removeHolder(accountId, h.holder_id); toast.success('Holder removed'); q.reload(); }
    catch (err) { toast.error(err?.message || 'Could not remove'); }
  };

  const filtered = (results.data || []).filter((c) => c.name?.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Card>
      <CardHeader title="Account holders" icon={Users} subtitle="Primary owner and joint / authorized holders" />
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          {q.loading ? <div className="flex items-center gap-2 text-slate-400 text-sm py-2"><Spinner size={15} /> Loading…</div>
            : (q.data || []).map((h) => (
              <div key={h.holder_id || h.customer_id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 text-2xs font-semibold">{initials(h.customer_name || '?')}</span>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{h.customer_name || h.customer_id?.slice(0, 8)}</div>
                    <div className="text-2xs text-slate-400 num">{(h.customer_id || '').slice(0, 12)}</div>
                  </div>
                  <Badge tone={h.role === 'primary' ? 'brand' : 'neutral'}>{h.role}</Badge>
                </div>
                {h.role !== 'primary' && <button onClick={() => remove(h)} className="text-slate-300 hover:text-danger-600"><Trash2 size={15} /></button>}
              </div>
            ))}
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-xs font-medium text-slate-600 mb-2">Add joint / authorized holder</div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer by name…" />
              {query.trim().length >= 2 && filtered.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-pop max-h-56 overflow-y-auto">
                  {filtered.map((c) => (
                    <button key={c.customer_id} onClick={() => add(c.customer_id)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">
                      {c.name} <span className="text-xs text-slate-400">· {(c.customer_id || '').slice(0, 8)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="h-9 px-2 text-sm border border-slate-300 rounded-md bg-white">
              <option value="joint">joint</option>
              <option value="authorized">authorized</option>
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
}

// OverdraftConfig lets an officer set the account's overdraft facility (limit + rate).
function OverdraftConfig({ account, onSaved }) {
  const { can } = useAuth();
  const toast = useToast();
  const editable = can('update_account');
  const [limit, setLimit] = useState(String(account.overdraft_limit ?? '0'));
  const [rate, setRate] = useState(String(account.overdraft_rate ?? '0'));
  const [busy, setBusy] = useState(false);
  const dirty = limit !== String(account.overdraft_limit ?? '0') || rate !== String(account.overdraft_rate ?? '0');

  const save = async () => {
    setBusy(true);
    try {
      await OverdraftApi.set(account.account_id, String(parseFloat(limit) || 0), String(parseFloat(rate) || 0));
      toast.success('Overdraft facility updated');
      onSaved?.();
    } catch (err) { toast.error(err?.message || 'Could not update overdraft'); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader title="Overdraft facility" icon={Gauge} subtitle="Allow the balance to go negative up to a limit; interest accrues daily on the overdrawn amount" />
      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <Field label={`Overdraft limit (${account.currency})`}>
          <Input value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^0-9.]/g, ''))} disabled={!editable} mono inputMode="decimal" />
        </Field>
        <Field label="Overdraft rate (% p.a.)">
          <Input value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ''))} disabled={!editable} mono inputMode="decimal" />
        </Field>
        {editable && (
          <div className="flex justify-end">
            <Button loading={busy} disabled={!dirty} onClick={save}>Save overdraft</Button>
          </div>
        )}
      </div>
      <div className="px-4 pb-4 text-2xs text-slate-400">
        Current available: {formatMoney(Number(account.balance) + Number(account.overdraft_limit || 0), account.currency)}
        {' '}(balance {formatMoney(account.balance, account.currency)} + limit {formatMoney(account.overdraft_limit || 0, account.currency)}).
      </div>
    </Card>
  );
}
