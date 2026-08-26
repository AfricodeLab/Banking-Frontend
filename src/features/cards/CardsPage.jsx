import React, { useMemo, useState } from 'react';
import { CreditCard, Plus, Nfc, Lock, LockOpen, ShieldCheck } from 'lucide-react';
import { CardApi, AccountApi, CustomerApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { loadAllAccounts, asList } from '../accounts/accountsData.js';
import { PageHeader, Card, Button, Input, StatCard, Badge, StatusPill, Modal, Field, Select, EmptyState, Spinner, useToast, useConfirm, SearchInput, ResultCount } from '../../components/ui/index.js';
import { PermissionButton } from '../../lib/auth/Can.jsx';
import { formatMoney, maskCard, formatDate } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

async function loadAllCards() {
  const accounts = await loadAllAccounts();
  const per = await Promise.all(
    accounts.map((a) =>
      CardApi.byAccount(a.account_id).then(asList)
        .then((cs) => cs.map((c) => ({ ...c, customer_name: a.customer_name, holder_account: a })))
        .catch(() => []),
    ),
  );
  return per.flat();
}

export function CardsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const { data, loading, error, reload } = useAsync(() => loadAllCards(), []);

  const cards = data || [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter((c) => [c.customer_name, c.card_number, c.card_type, c.scheme, c.status].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
  }, [cards, q]);

  const active = cards.filter((c) => String(c.status).toLowerCase() === 'active').length;
  const blocked = cards.filter((c) => String(c.status).toLowerCase() === 'blocked').length;

  const toggleBlock = async (c) => {
    const blockedNow = String(c.status).toLowerCase() === 'blocked';
    const ok = await confirm({
      title: blockedNow ? 'Unblock card?' : 'Block card?',
      message: blockedNow
        ? `Reactivate card ${maskCard(c.card_number)} for ${c.customer_name}?`
        : `Block card ${maskCard(c.card_number)}? ${c.customer_name} won't be able to transact until it's unblocked.`,
      confirmLabel: blockedNow ? 'Unblock' : 'Block card',
      tone: blockedNow ? 'primary' : 'danger',
    });
    if (!ok) return;
    setBusyId(c.card_id);
    try {
      await (blockedNow ? CardApi.unblock(c.card_id) : CardApi.block(c.card_id));
      toast.success(blockedNow ? 'Card unblocked' : 'Card blocked');
      await reload();
    } catch (err) { toast.error(err?.message || 'Could not update card'); }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <PageHeader title="Cards" description="Debit & credit card issuance and lifecycle"
        actions={<PermissionButton permission="create_account" icon={Plus} onClick={() => setOpen(true)}>Issue card</PermissionButton>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Total cards" value={loading ? '—' : cards.length} icon={CreditCard} accent="brand" />
        <StatCard label="Active" value={loading ? '—' : active} icon={ShieldCheck} accent="success" />
        <StatCard label="Blocked" value={loading ? '—' : blocked} icon={Lock} accent={blocked ? 'danger' : 'slate'} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search holder, card number, type…" width="w-80" />
        <ResultCount shown={rows.length} noun="cards" loading={loading} />
      </div>

      {loading && <div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Spinner size={20} /> Loading cards…</div>}
      {error && <div className="py-8 text-center text-sm text-danger-600">{String(error.message)}</div>}
      {!loading && !error && rows.length === 0 && (
        <Card><EmptyState icon={CreditCard} title={q ? 'No matching cards' : 'No cards issued'} description={q ? 'Try another search.' : 'Issue the first card against an account.'} action={!q && <Button icon={Plus} onClick={() => setOpen(true)}>Issue card</Button>} /></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((c) => (
          <CardVisual key={c.card_id} card={c} busy={busyId === c.card_id} onToggle={() => toggleBlock(c)} />
        ))}
      </div>

      <IssueCardModal open={open} onClose={() => setOpen(false)} onIssued={() => reload()} />
    </div>
  );
}

function CardVisual({ card, busy, onToggle }) {
  const blocked = String(card.status).toLowerCase() === 'blocked';
  const isCredit = String(card.card_type).toLowerCase() === 'credit';
  return (
    <div className="card overflow-hidden">
      <div className={cn('relative p-5 text-white aspect-[1.9/1] flex flex-col justify-between overflow-hidden',
        isCredit ? 'bg-gradient-to-br from-navy-950 via-navy-900 to-brand-800' : 'bg-gradient-to-br from-brand-800 via-brand-700 to-teal-600')}>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold tracking-wide">AfriCore</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">{card.card_type} card</div>
          </div>
          {card.virtual
            ? <span className="text-[9px] font-semibold uppercase tracking-wide bg-white/15 rounded px-1.5 py-0.5">Virtual</span>
            : <Nfc size={22} className="text-white/70" />}
        </div>
        <div className="relative">
          <div className="w-9 h-6 rounded-md bg-gradient-to-br from-yellow-200/90 to-yellow-500/80 mb-2.5" />
          <div className="num text-lg tracking-[0.18em]">{maskCard(card.card_number)}</div>
        </div>
        <div className="relative flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-white/50">Card holder</div>
            <div className="text-sm font-medium truncate max-w-[150px]">{card.customer_name || '—'}</div>
            <div className="num text-2xs text-white/70 mt-0.5">EXP {card.expiry_date ? formatDate(card.expiry_date, { month: '2-digit', year: '2-digit' }) : '—'}</div>
          </div>
          <SchemeMark scheme={card.scheme} />
        </div>
        {blocked && <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-[1px] flex items-center justify-center"><Badge tone="danger"><Lock size={11} /> Blocked</Badge></div>}
      </div>
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <StatusPill status={card.status} />
          <span className="num">· {formatMoney(card.daily_limit)} daily</span>
        </div>
        <Button size="xs" variant={blocked ? 'success' : 'secondary'} icon={blocked ? LockOpen : Lock} loading={busy} onClick={onToggle}>
          {blocked ? 'Unblock' : 'Block'}
        </Button>
      </div>
    </div>
  );
}

function SchemeMark({ scheme }) {
  const s = String(scheme || 'visa').toLowerCase();
  if (s === 'mastercard') {
    return (
      <div className="flex items-center shrink-0" title="Mastercard">
        <span className="w-6 h-6 rounded-full bg-red-500" />
        <span className="w-6 h-6 rounded-full bg-amber-400 -ml-2.5 mix-blend-hard-light" />
      </div>
    );
  }
  if (s === 'verve') return <span className="font-bold text-base tracking-tight text-white shrink-0" title="Verve">verve</span>;
  if (s === 'amex') return <span className="font-semibold tracking-[0.2em] text-xs shrink-0" title="American Express">AMEX</span>;
  return <span className="italic font-extrabold text-lg tracking-tight shrink-0" title="Visa">VISA</span>;
}

function IssueCardModal({ open, onClose, onIssued }) {
  const toast = useToast();
  const accounts = useAsync(async () => {
    const accts = await loadAllAccounts();
    return accts;
  }, [], { immediate: open });
  const [form, setForm] = useState({ account_id: '', card_type: 'debit', scheme: 'visa', virtual: false, expiry_date: defaultExpiry() });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const acctList = accounts.data || [];

  const submit = async () => {
    if (!form.account_id) return toast.error('Select an account');
    if (!form.expiry_date) return toast.error('Set an expiry date');
    setBusy(true);
    try {
      await CardApi.issue(form.account_id, { card_type: form.card_type, scheme: form.scheme, virtual: form.virtual, expiry_date: form.expiry_date });
      toast.success('Card issued', { title: `${form.scheme} ${form.card_type}${form.virtual ? ' · virtual' : ''}` });
      onIssued?.();
      onClose();
    } catch (err) { toast.error(err?.message || 'Could not issue card'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Issue card" subtitle="Generate a debit or credit card for an account"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={CreditCard} loading={busy} onClick={submit}>Issue card</Button></>}>
      <div className="space-y-4">
        <Field label="Account" required hint={accounts.loading ? 'Loading accounts…' : undefined}>
          <Select value={form.account_id} onChange={set('account_id')}>
            <option value="">Select account…</option>
            {acctList.map((a) => <option key={a.account_id} value={a.account_id}>{a.customer_name} · {a.account_type} · {a.currency}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Card type" required>
            <Select value={form.card_type} onChange={set('card_type')}>
              <option value="debit">Debit</option><option value="credit">Credit</option>
            </Select>
          </Field>
          <Field label="Scheme" required>
            <Select value={form.scheme} onChange={set('scheme')}>
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="verve">Verve</option>
              <option value="amex">American Express</option>
            </Select>
          </Field>
          <Field label="Form factor" required>
            <div className="flex items-center gap-1 bg-slate-100 rounded-md p-0.5 h-9">
              {[{ v: false, l: 'Physical' }, { v: true, l: 'Virtual' }].map((o) => (
                <button key={o.l} type="button" onClick={() => setForm((f) => ({ ...f, virtual: o.v }))}
                  className={cn('flex-1 text-xs font-medium rounded px-2 py-1 transition-colors', form.virtual === o.v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {o.l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Expiry date" required>
            <Input type="date" value={form.expiry_date} onChange={set('expiry_date')} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function defaultExpiry() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 4);
  return d.toISOString().slice(0, 10);
}
