import React, { useMemo, useState } from 'react';
import { Receipt, Users, Wallet, Download, BarChart3, TrendingUp, CalendarRange, Landmark, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, PieChart } from 'lucide-react';
import { ReportApi, LoanApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { loadAllTransactions } from '../transactions/transactionsData.js';
import { loadAllAccounts, asList } from '../accounts/accountsData.js';
import { PageHeader, Card, CardHeader, CardBody, StatCard, Button, BarChart, DataTable, Badge, MiniBars } from '../../components/ui/index.js';
import { formatMoney, formatNumber, formatDate } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const iso = (d) => d.toISOString().slice(0, 10);
function presets() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysAgo = (n) => new Date(now.getTime() - n * 86400000);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return [
    { key: 'month', label: 'This month', from: iso(startOfMonth), to: iso(now) },
    { key: '7d', label: 'Last 7 days', from: iso(daysAgo(7)), to: iso(now) },
    { key: '30d', label: 'Last 30 days', from: iso(daysAgo(30)), to: iso(now) },
    { key: 'ytd', label: 'Year to date', from: iso(startOfYear), to: iso(now) },
  ];
}

const TYPE_META = {
  deposit: { icon: ArrowDownLeft, tone: 'success', label: 'Deposits' },
  withdrawal: { icon: ArrowUpRight, tone: 'danger', label: 'Withdrawals' },
  transfer: { icon: ArrowLeftRight, tone: 'brand', label: 'Transfers' },
};

export function ReportsPage() {
  const P = useMemo(presets, []);
  const [range, setRange] = useState({ from: P[0].from, to: P[0].to, preset: 'month' });
  const params = { start_date: range.from, end_date: range.to };

  const tx = useAsync(() => ReportApi.transactions(params), [range.from, range.to]);
  const cust = useAsync(() => ReportApi.customers(params).catch(() => null), [range.from, range.to]);
  const acct = useAsync(() => ReportApi.accounts(params).catch(() => null), [range.from, range.to]);
  const daily = useAsync(() => ReportApi.dailySummary(params).then((r) => (Array.isArray(r) ? r : r?.data || [])).catch(() => []), [range.from, range.to]);
  const allTx = useAsync(() => loadAllTransactions().catch(() => []), []);
  const accounts = useAsync(() => loadAllAccounts().catch(() => []), []);
  const loans = useAsync(() => LoanApi.list().then(asList).catch(() => []), []);

  const dailyRows = daily.data || [];
  const chartData = dailyRows.map((d) => ({ label: formatDate(d.date, { month: 'short', day: 'numeric' }), value: parseFloat(d.total_amount || 0) }));

  // Transaction mix within the selected period (from the full register).
  const mix = useMemo(() => {
    const from = new Date(range.from), to = new Date(range.to + 'T23:59:59');
    const inRange = (allTx.data || []).filter((t) => { const d = new Date(t.transaction_date); return d >= from && d <= to; });
    const agg = { deposit: 0, withdrawal: 0, transfer: 0 };
    const cnt = { deposit: 0, withdrawal: 0, transfer: 0 };
    inRange.forEach((t) => { if (agg[t.transaction_type] != null) { agg[t.transaction_type] += parseFloat(t.amount || 0); cnt[t.transaction_type] += 1; } });
    return { agg, cnt };
  }, [allTx.data, range]);

  const mixBars = ['deposit', 'withdrawal', 'transfer'].map((k) => ({ label: TYPE_META[k].label, value: mix.agg[k], display: `${mix.cnt[k]} · ${formatMoney(mix.agg[k], 'GHS')}`, tone: TYPE_META[k].tone }));

  const acctByType = useMemo(() => {
    const map = {};
    (accounts.data || []).forEach((a) => { const k = a.account_type || 'other'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([label, value], i) => ({ label, value, tone: ['brand', 'teal', 'success', 'slate'][i % 4] }));
  }, [accounts.data]);
  const depByCcy = useMemo(() => {
    const map = {};
    (accounts.data || []).forEach((a) => { const k = a.currency || 'GHS'; map[k] = (map[k] || 0) + (parseFloat(a.balance) || 0); });
    return Object.entries(map).map(([label, value], i) => ({ label, value, display: formatNumber(value, { maximumFractionDigits: 0 }), tone: ['teal', 'brand', 'success', 'slate'][i % 4] }));
  }, [accounts.data]);

  const loanList = loans.data || [];
  const outstanding = loanList.reduce((s, l) => s + (Number(l.remaining_balance) || 0), 0);
  const disbursed = loanList.reduce((s, l) => s + (Number(l.principal_amount) || 0), 0);

  const exportCsv = () => {
    const header = 'date,transaction_count,total_amount,average_amount';
    const lines = dailyRows.map((d) => `${String(d.date).slice(0, 10)},${d.transaction_count},${d.total_amount},${d.average_amount}`);
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `report_${range.from}_${range.to}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Operational and management reporting"
        actions={<Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!dailyRows.length}>Export CSV</Button>} />

      {/* Date range */}
      <Card className="mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500"><CalendarRange size={16} className="text-slate-400" /> Reporting period</div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {P.map((p) => (
              <button key={p.key} onClick={() => setRange({ from: p.from, to: p.to, preset: p.key })}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors', range.preset === p.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>{p.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 lg:ml-auto num text-sm">
            <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value, preset: '' }))} className="h-9 px-3 border border-slate-300 rounded-md focus:outline-none focus:border-brand-500" />
            <span className="text-slate-400">→</span>
            <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value, preset: '' }))} className="h-9 px-3 border border-slate-300 rounded-md focus:outline-none focus:border-brand-500" />
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="Transactions" value={tx.loading ? '—' : formatNumber(tx.data?.total_transactions ?? 0)} icon={Receipt} accent="brand" footer={`avg ${formatMoney(tx.data?.average_amount || 0)}`} />
        <StatCard label="Transaction value" value={tx.loading ? '—' : formatMoney(tx.data?.total_amount || 0)} icon={TrendingUp} accent="teal" footer="Total posted" />
        <StatCard label="Customers" value={cust.loading ? '—' : formatNumber(cust.data?.total_customers ?? 0)} icon={Users} accent="success" footer={`${cust.data?.new_customers ?? 0} new · ${cust.data?.active_customers ?? 0} verified`} />
        <StatCard label="Deposits held" value={acct.loading ? '—' : formatMoney(acct.data?.total_balance || 0)} icon={Wallet} accent="brand" footer={`${acct.data?.active_accounts ?? 0}/${acct.data?.total_accounts ?? 0} accounts`} />
      </div>

      {/* Trend + period summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily transaction volume" icon={BarChart3} subtitle={`${range.from} → ${range.to}`} />
          <CardBody>{daily.loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : <BarChart data={chartData} formatValue={(v) => formatMoney(v)} />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Period summary" icon={CalendarRange} />
          <div className="p-4 space-y-2.5 text-sm">
            <Row label="Total transactions" value={formatNumber(tx.data?.total_transactions ?? 0)} />
            <Row label="Total value" value={formatMoney(tx.data?.total_amount || 0)} />
            <Row label="Average txn" value={formatMoney(tx.data?.average_amount || 0)} />
            <div className="border-t border-slate-100 my-2" />
            <Row label="Customers" value={formatNumber(cust.data?.total_customers ?? 0)} />
            <Row label="New this period" value={formatNumber(cust.data?.new_customers ?? 0)} />
            <Row label="KYC verified" value={<Badge tone="success">{cust.data?.active_customers ?? 0}</Badge>} />
            <div className="border-t border-slate-100 my-2" />
            <Row label="Accounts active" value={`${acct.data?.active_accounts ?? 0}/${acct.data?.total_accounts ?? 0}`} />
            <Row label="Avg. balance" value={formatMoney(acct.data?.average_balance || 0)} />
          </div>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader title="Transaction mix" icon={PieChart} subtitle="By value in period" />
          <CardBody>{allTx.loading ? <div className="py-6 text-center text-sm text-slate-400">Loading…</div> : <MiniBars items={mixBars} />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Accounts by product" icon={Wallet} />
          <CardBody>{accounts.loading ? <div className="py-6 text-center text-sm text-slate-400">Loading…</div> : <MiniBars items={acctByType} />}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Deposits by currency" icon={TrendingUp} />
          <CardBody>{accounts.loading ? <div className="py-6 text-center text-sm text-slate-400">Loading…</div> : <MiniBars items={depByCcy} />}</CardBody>
        </Card>
      </div>

      {/* Loan book + daily table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Loan book" icon={Landmark} />
          <div className="p-4 space-y-2.5 text-sm">
            <Row label="Total loans" value={formatNumber(loanList.length)} />
            <Row label="Active" value={formatNumber(loanList.filter((l) => String(l.status).toLowerCase() === 'active').length)} />
            <Row label="Outstanding" value={formatMoney(outstanding, 'GHS')} />
            <Row label="Disbursed" value={formatMoney(disbursed, 'GHS')} />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Daily breakdown" icon={Receipt} actions={<Button variant="ghost" size="sm" icon={Download} onClick={exportCsv} disabled={!dailyRows.length}>CSV</Button>} />
          <DataTable
            columns={[
              { key: 'date', header: 'Date', render: (d) => formatDate(d.date) },
              { key: 'transaction_count', header: 'Transactions', align: 'right', className: 'num', render: (d) => formatNumber(d.transaction_count) },
              { key: 'total_amount', header: 'Total value', align: 'right', className: 'num font-medium text-slate-800', render: (d) => formatMoney(d.total_amount) },
              { key: 'average_amount', header: 'Average', align: 'right', className: 'num text-slate-500', render: (d) => formatMoney(d.average_amount) },
            ]}
            rows={daily.loading ? null : dailyRows} loading={daily.loading} rowKey={(d, i) => d.date || i} pageSize={8}
            empty={{ icon: BarChart3, title: 'No activity', description: 'No transactions in this period.' }}
          />
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{label}</span><span className="num font-medium text-slate-800">{value}</span></div>;
}
