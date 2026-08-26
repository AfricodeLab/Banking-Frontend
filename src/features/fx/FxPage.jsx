import React, { useMemo, useState } from 'react';
import { Repeat, ArrowRightLeft, TrendingUp, Search, Info, RefreshCw, SlidersHorizontal, Plus, Trash2, Pencil } from 'lucide-react';
import { ExchangeRateApi, FxRateApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { CURRENCIES } from '../../lib/config.js';
import { PageHeader, Card, CardHeader, CardBody, Field, Select, Input, Button, DataTable, Badge, Spinner, useToast, useConfirm } from '../../components/ui/index.js';
import { formatNumber, formatDate, formatDateTime } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const fmt = (n) => (n == null || Number.isNaN(n) ? '—' : formatNumber(n, { minimumFractionDigits: 2, maximumFractionDigits: 4 }));

export function FxPage() {
  const currenciesQ = useAsync(() => ExchangeRateApi.currencies(), []);
  const currencyMap = currenciesQ.data || {};
  const providerCodes = useMemo(() => Object.keys(currencyMap).sort(), [currencyMap]);
  const allCodes = useMemo(() => Array.from(new Set([...Object.keys(currencyMap), ...CURRENCIES])).sort(), [currencyMap]);

  // Admin board rates (custom overrides / unquoted pairs like GHS)
  const custom = useAsync(() => FxRateApi.list(), []);
  const customList = custom.data || [];
  const customMap = useMemo(() => Object.fromEntries(customList.map((r) => [`${r.base_currency}/${r.quote_currency}`, r])), [customList]);

  // Converter
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('GHS');
  const [amount, setAmount] = useState('1000');
  const fromRates = useAsync(() => ExchangeRateApi.latest({ base: from }).catch(() => null), [from]);

  const resolve = (f, t) => {
    if (f === t) return { rate: 1, source: 'same' };
    if (customMap[`${f}/${t}`]) return { rate: customMap[`${f}/${t}`].rate, source: 'board' };
    if (customMap[`${t}/${f}`]) return { rate: 1 / customMap[`${t}/${f}`].rate, source: 'board' };
    const p = fromRates.data?.rates?.[t];
    if (p != null) return { rate: p, source: 'market' };
    return null;
  };
  const resolved = resolve(from, to);
  const amt = parseFloat(amount || '0');
  const converted = resolved ? amt * resolved.rate : null;
  const swap = () => { setFrom(to); setTo(from); };

  // Provider rates board (only provider-quoted bases)
  const [base, setBase] = useState('USD');
  const [q, setQ] = useState('');
  const boardQ = useAsync(() => ExchangeRateApi.latest({ base }).catch(() => null), [base]);
  const boardRows = useMemo(() => {
    const rates = boardQ.data?.rates || {};
    const term = q.trim().toLowerCase();
    return Object.entries(rates)
      .map(([code, r]) => ({ code, name: currencyMap[code] || code, rate: r }))
      .filter((row) => !term || row.code.toLowerCase().includes(term) || row.name.toLowerCase().includes(term));
  }, [boardQ.data, q, currencyMap]);

  return (
    <div>
      <PageHeader title="Foreign Exchange" description="Live market rates, board rates & currency conversion" />

      <div className="flex items-start gap-2 mb-4 text-xs text-slate-500 bg-warning-50 border border-warning-500/20 rounded-lg px-3 py-2">
        <Info size={15} className="mt-0.5 shrink-0 text-warning-600" />
        <p>The market feed quotes major convertible currencies only (<span className="font-medium text-slate-700">GHS is not quoted</span>). Set your own <span className="font-medium text-slate-700">board rates</span> below to price GHS and override market rates — the converter uses board rates first.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        {/* Converter */}
        <Card className="self-start">
          <CardHeader title="Currency converter" icon={Repeat} subtitle={fromRates.data?.date ? `As of ${formatDate(fromRates.data.date)}` : undefined} />
          <CardBody className="space-y-4">
            <Field label="Amount">
              <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} mono inputMode="decimal" placeholder="0.00" />
            </Field>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <Field label="From">
                <Select value={from} onChange={(e) => setFrom(e.target.value)}>{allCodes.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
              </Field>
              <button type="button" onClick={swap} title="Swap" className="flex items-center justify-center w-9 h-9 mb-0.5 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-brand-600"><ArrowRightLeft size={16} /></button>
              <Field label="To">
                <Select value={to} onChange={(e) => setTo(e.target.value)}>{allCodes.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
              </Field>
            </div>

            <div className="rounded-lg bg-gradient-to-br from-navy-900 to-brand-800 text-white p-4">
              {!resolved && fromRates.loading ? (
                <div className="flex items-center gap-2 text-white/70 text-sm py-3"><Spinner size={16} /> Fetching rates…</div>
              ) : !resolved ? (
                <div className="text-sm text-white/80 py-2">No rate for {from}→{to}. <span className="text-white/60">Add a board rate below.</span></div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60">{fmt(amt)} {from} =</div>
                    <Badge tone={resolved.source === 'board' ? 'warning' : 'teal'}>{resolved.source === 'board' ? 'board rate' : 'market'}</Badge>
                  </div>
                  <div className="num text-3xl font-semibold leading-tight mt-1">{fmt(converted)} <span className="text-lg text-white/80">{to}</span></div>
                  <div className="text-xs text-white/60 mt-2 flex items-center gap-1.5 flex-wrap">
                    <TrendingUp size={13} /> 1 {from} = <span className="num">{fmt(resolved.rate)}</span> {to}
                    <span className="mx-1 text-white/30">·</span> 1 {to} = <span className="num">{fmt(1 / resolved.rate)}</span> {from}
                  </div>
                </>
              )}
            </div>
            <p className="text-2xs text-slate-400">{currencyMap[from] || from} → {currencyMap[to] || to}. Indicative; dealing rates may differ.</p>
          </CardBody>
        </Card>

        {/* Provider rates board */}
        <Card>
          <CardHeader title="Market rates board" icon={TrendingUp}
            subtitle={boardQ.data?.date ? `Base ${base} · ${formatDate(boardQ.data.date)}` : undefined}
            actions={<Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => boardQ.reload()}>Refresh</Button>} />
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <Select value={base} onChange={(e) => setBase(e.target.value)} className="h-9 w-28">{providerCodes.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search currency…" className="pl-9" />
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'code', header: 'Currency', render: (r) => <div className="flex items-center gap-2"><Badge tone="neutral">{r.code}</Badge><span className="text-slate-600 truncate">{r.name}</span></div> },
              { key: 'rate', header: `1 ${base} =`, align: 'right', className: 'num font-medium text-slate-800', render: (r) => fmt(r.rate) },
              { key: 'inverse', header: `1 → ${base}`, align: 'right', className: 'num text-slate-500', render: (r) => fmt(1 / r.rate) },
            ]}
            rows={boardQ.loading ? null : boardRows} loading={boardQ.loading} rowKey={(r) => r.code} pageSize={10}
            empty={{ icon: Repeat, title: 'No rates', description: 'This base currency is not quoted by the market feed.' }} />
        </Card>
      </div>

      {/* Admin board rates */}
      <div className="mt-4">
        <BoardRatesCard codes={allCodes} rates={customList} loading={custom.loading} onChange={() => custom.reload()} />
      </div>
    </div>
  );
}

function BoardRatesCard({ codes, rates, loading, onChange }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({ base_currency: 'USD', quote_currency: 'GHS', rate: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const r = parseFloat(form.rate);
    if (!r || r <= 0) return toast.error('Enter a valid rate');
    if (form.base_currency === form.quote_currency) return toast.error('Base and quote must differ');
    setBusy(true);
    try {
      await FxRateApi.upsert({ base_currency: form.base_currency, quote_currency: form.quote_currency, rate: r });
      toast.success('Board rate saved', { title: `1 ${form.base_currency} = ${r} ${form.quote_currency}` });
      setForm((f) => ({ ...f, rate: '' }));
      onChange?.();
    } catch (err) { toast.error(err?.message || 'Could not save rate'); }
    finally { setBusy(false); }
  };

  const editRow = (row) => setForm({ base_currency: row.base_currency, quote_currency: row.quote_currency, rate: String(row.rate) });
  const remove = async (row) => {
    const ok = await confirm({ title: 'Remove board rate?', message: `Remove the ${row.base_currency}→${row.quote_currency} board rate? Conversions for this pair will fall back to the market feed.`, confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    try { await FxRateApi.remove(row.rate_id); toast.success('Board rate removed'); onChange?.(); }
    catch (err) { toast.error(err?.message || 'Could not remove'); }
  };

  return (
    <Card>
      <CardHeader title="Board rates (admin)" icon={SlidersHorizontal} subtitle="Set internal rates for unquoted pairs (e.g. GHS) or override the market" />
      <div className="p-4 grid grid-cols-1 lg:grid-cols-[auto_auto_1fr_auto] items-end gap-3 border-b border-slate-100">
        <Field label="Base"><Select value={form.base_currency} onChange={set('base_currency')} className="w-24">{codes.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <Field label="Quote"><Select value={form.quote_currency} onChange={set('quote_currency')} className="w-24">{codes.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <Field label={`Rate (1 ${form.base_currency} = ? ${form.quote_currency})`}>
          <Input value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value.replace(/[^0-9.]/g, '') }))} mono inputMode="decimal" placeholder="0.0000" />
        </Field>
        <Button icon={Plus} loading={busy} onClick={save}>Set rate</Button>
      </div>
      <DataTable
        columns={[
          { key: 'pair', header: 'Pair', render: (r) => <span className="font-medium text-slate-800"><Badge tone="neutral">{r.base_currency}</Badge> <span className="text-slate-400">→</span> <Badge tone="neutral">{r.quote_currency}</Badge></span> },
          { key: 'rate', header: 'Rate', align: 'right', className: 'num font-medium text-slate-800', render: (r) => `1 ${r.base_currency} = ${fmt(r.rate)} ${r.quote_currency}` },
          { key: 'updated_at', header: 'Updated', render: (r) => <span className="text-slate-500 text-xs">{formatDateTime(r.updated_at)}</span> },
          {
            key: 'actions', header: '', align: 'right',
            render: (r) => (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="xs" variant="ghost" icon={Pencil} onClick={() => editRow(r)}>Edit</Button>
                <Button size="xs" variant="ghost" icon={Trash2} onClick={() => remove(r)}>Remove</Button>
              </div>
            ),
          },
        ]}
        rows={loading ? null : rates} loading={loading} rowKey={(r) => r.rate_id} pageSize={8}
        empty={{ icon: SlidersHorizontal, title: 'No board rates', description: 'Add an internal rate — e.g. 1 USD = 16 GHS — to price GHS pairs.' }}
      />
    </Card>
  );
}
