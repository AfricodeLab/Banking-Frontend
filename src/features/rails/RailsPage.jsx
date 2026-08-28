import React, { useEffect, useMemo, useState } from 'react';
import { Send, Radio, Building2, Smartphone, Globe2, Landmark, RefreshCw } from 'lucide-react';
import { PayoutApi } from '../../lib/api/index.js';
import { loadAllAccounts, asList } from '../accounts/accountsData.js';
import { useAsync } from '../../lib/useAsync.js';
import {
  PageHeader, Card, CardHeader, DataTable, StatusPill, Button, Field, Input, Select, Badge,
  Toolbar, ToolbarRow, ToolbarSpacer, ResultCount, useToast, useConfirm,
} from '../../components/ui/index.js';
import { formatMoney, formatDateTime } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const RAIL_ICON = { GIP: Building2, MOMO: Smartphone, RTGS: Landmark, SWIFT: Globe2 };
const DEST_HINT = { bank_account: 'Beneficiary account number & bank', phone: 'Mobile money number', iban: 'IBAN / SWIFT account' };

export function RailsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const railsQ = useAsync(() => PayoutApi.rails().then((r) => r.rails || []), []);
  const accountsQ = useAsync(() => loadAllAccounts().then(asList), []);
  const payoutsQ = useAsync(() => PayoutApi.list().then((r) => r.payouts || []), []);

  const [rail, setRail] = useState('GIP');
  const [fromId, setFromId] = useState('');
  const [destName, setDestName] = useState('');
  const [destRef, setDestRef] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const rails = railsQ.data || [];
  const accounts = accountsQ.data || [];
  const railInfo = useMemo(() => rails.find((r) => r.code === rail), [rails, rail]);
  const fromAcct = accounts.find((a) => a.account_id === fromId);

  // Poll while any payment is still in flight so the operator sees it settle.
  useEffect(() => {
    const inFlight = (payoutsQ.data || []).some((p) => p.status === 'queued' || p.status === 'sent');
    if (!inFlight) return undefined;
    const t = setInterval(() => payoutsQ.reload(), 6000);
    return () => clearInterval(t);
  }, [payoutsQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!fromId) return toast.error('Select a source account');
    if (!destName.trim() || !destRef.trim()) return toast.error('Enter the destination details');
    if (!(amt > 0)) return toast.error('Enter a valid amount');
    const ok = await confirm({
      title: 'Send payment?',
      message: `Send ${formatMoney(amt, fromAcct?.currency || 'GHS')} via ${railInfo?.name || rail} to ${destName.trim()}. This debits the source account immediately.`,
      confirmLabel: 'Send payment',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await PayoutApi.create({
        rail, from_account_id: fromId, destination_name: destName.trim(),
        destination_ref: destRef.trim(), amount: String(amt.toFixed(2)), currency: fromAcct?.currency || 'GHS',
      });
      toast.success('Payment queued', { title: `${formatMoney(amt, fromAcct?.currency || 'GHS')} · ${rail}` });
      setDestName(''); setDestRef(''); setAmount('');
      accountsQ.reload(); payoutsQ.reload();
    } catch (err) {
      toast.error(err?.message || 'Could not send payment');
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'rail', header: 'Rail', width: '120px',
      render: (p) => {
        const Icon = RAIL_ICON[p.rail] || Radio;
        return <span className="inline-flex items-center gap-1.5 font-medium text-slate-700"><Icon size={14} className="text-slate-400" />{p.rail}</span>;
      },
    },
    { key: 'destination_name', header: 'Beneficiary', render: (p) => <div><div className="text-slate-700">{p.destination_name}</div><div className="num text-xs text-slate-400">{p.destination_ref}</div></div> },
    { key: 'reference', header: 'Reference', className: 'num text-xs text-slate-400', render: (p) => p.reference },
    { key: 'created_at', header: 'Created', render: (p) => <span className="text-slate-500 text-xs">{formatDateTime(p.created_at)}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusPill status={p.status} /> },
    { key: 'amount', header: 'Amount', align: 'right', className: 'num font-semibold text-slate-800', render: (p) => formatMoney(p.amount, p.currency) },
  ];

  return (
    <div>
      <PageHeader title="Payment Rails" description="Send funds to other banks, wallets and abroad — GIP, Mobile Money, RTGS and SWIFT" />

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
        {/* Send form */}
        <Card className="self-start">
          <CardHeader title="Send a payment" icon={Send} />
          <form onSubmit={submit} className="p-4 space-y-4">
            <Field label="Rail">
              <div className="grid grid-cols-2 gap-2">
                {rails.map((r) => {
                  const Icon = RAIL_ICON[r.code] || Radio;
                  const on = rail === r.code;
                  return (
                    <button key={r.code} type="button" onClick={() => setRail(r.code)}
                      className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors', on ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
                      <Icon size={16} className={cn('mt-0.5', on ? 'text-brand-600' : 'text-slate-400')} />
                      <div>
                        <div className="text-sm font-medium text-slate-700">{r.code}</div>
                        <div className="text-2xs text-slate-400 leading-tight">{r.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="From account" required>
              <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
                <option value="">Select account…</option>
                {accounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {a.account_number || a.account_id.slice(0, 8)} · {a.customer_name || a.account_type} · {formatMoney(a.balance, a.currency)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Beneficiary name" required>
              <Input value={destName} onChange={(e) => setDestName(e.target.value)} placeholder="e.g. Kofi Boateng" />
            </Field>

            <Field label="Destination" required hint={railInfo ? DEST_HINT[railInfo.dest_type] : undefined}>
              <Input value={destRef} onChange={(e) => setDestRef(e.target.value)} mono placeholder={railInfo?.dest_type === 'phone' ? '024 000 0000' : railInfo?.dest_type === 'iban' ? 'GH00 0000 0000' : 'Account no. · Bank'} />
            </Field>

            <Field label="Amount" required>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} mono placeholder="0.00" />
            </Field>

            <Button type="submit" icon={Send} loading={busy} className="w-full">Send payment</Button>
          </form>
        </Card>

        {/* Recent payouts */}
        <Card>
          <Toolbar>
            <ToolbarRow>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><Radio size={16} className="text-slate-400" /> Outbound payments</div>
              <ToolbarSpacer />
              <ResultCount shown={(payoutsQ.data || []).length} noun="payments" loading={payoutsQ.loading} />
              <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => payoutsQ.reload()}>Refresh</Button>
            </ToolbarRow>
          </Toolbar>
          <DataTable
            columns={columns}
            rows={payoutsQ.loading ? null : (payoutsQ.data || [])}
            loading={payoutsQ.loading}
            error={payoutsQ.error}
            rowKey={(p) => p.payment_id}
            empty={{ icon: Radio, title: 'No payments yet', description: 'Outbound payments you send will appear here and settle automatically.' }}
          />
        </Card>
      </div>
    </div>
  );
}
