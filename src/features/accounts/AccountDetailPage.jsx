import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Receipt, CreditCard, Banknote, Snowflake, Power, ArrowDownLeft, ArrowUpRight, User } from 'lucide-react';
import { AccountApi, TransactionApi, CustomerApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { Card, CardHeader, Tabs, StatusPill, Badge, Button, DataTable, Spinner, useToast } from '../../components/ui/index.js';
import { formatMoney, formatDateTime, formatDate } from '../../lib/format.js';
import { asList } from './accountsData.js';
import { useLeafCrumb } from '../../components/layout/Breadcrumbs.jsx';

export function AccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
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
