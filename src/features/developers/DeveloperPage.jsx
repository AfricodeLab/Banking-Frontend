import React, { useState } from 'react';
import { KeyRound, Plus, Copy, Check, Trash2, Terminal, ShieldCheck, Globe2 } from 'lucide-react';
import { ApiKeyApi } from '../../lib/api/index.js';
import { API_BASE_URL } from '../../lib/api/client.js';
import { useAsync } from '../../lib/useAsync.js';
import { asList } from '../accounts/accountsData.js';
import { PageHeader, Card, CardHeader, DataTable, Badge, Button, Field, Input, Modal, useToast, useConfirm } from '../../components/ui/index.js';
import { formatDateTime } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const SCOPES = [
  { key: 'read', label: 'Read', desc: 'Accounts, balances, transactions' },
  { key: 'payments', label: 'Payments', desc: 'Initiate transfers / payouts' },
];

const ENDPOINTS = [
  { method: 'GET', path: '/v1/ping', scope: 'any' },
  { method: 'GET', path: '/v1/accounts/{id}', scope: 'read' },
  { method: 'GET', path: '/v1/accounts/{id}/transactions', scope: 'read' },
  { method: 'POST', path: '/v1/payments', scope: 'payments' },
];

export function DeveloperPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const keys = useAsync(() => ApiKeyApi.list().then(asList), []);
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState(null);

  const revoke = async (k) => {
    const ok = await confirm({ title: 'Revoke API key?', message: `Revoke “${k.name}” (${k.prefix}…)? Any partner using it will immediately lose access.`, confirmLabel: 'Revoke', tone: 'danger' });
    if (!ok) return;
    try { await ApiKeyApi.revoke(k.key_id); toast.success('API key revoked'); keys.reload(); }
    catch (err) { toast.error(err?.message || 'Could not revoke'); }
  };

  return (
    <div>
      <PageHeader title="Developers" description="Partner API access — keys, scopes and documentation"
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>Create API key</Button>} />

      {/* Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Getting started" icon={Globe2} subtitle="Base URL & authentication" />
          <div className="p-4 space-y-3 text-sm">
            <div>
              <div className="text-2xs uppercase tracking-wide text-slate-400 mb-1">Base URL</div>
              <code className="num text-xs bg-slate-900 text-slate-100 rounded-md px-3 py-2 block">{API_BASE_URL}/v1</code>
            </div>
            <div>
              <div className="text-2xs uppercase tracking-wide text-slate-400 mb-1">Authentication header</div>
              <code className="num text-xs bg-slate-900 text-slate-100 rounded-md px-3 py-2 block">X-API-Key: ak_live_••••••••••</code>
            </div>
            <p className="text-xs text-slate-500">Every request must include a valid, active API key. Endpoints are scoped — a key only reaches the resources its scopes allow.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Scopes" icon={ShieldCheck} />
          <div className="p-4 space-y-2.5">
            {SCOPES.map((s) => (
              <div key={s.key} className="flex items-start gap-2.5">
                <Badge tone="brand">{s.key}</Badge>
                <div className="text-xs text-slate-500">{s.desc}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Keys */}
      <Card className="mb-4">
        <CardHeader title="API keys" icon={KeyRound} subtitle="Issued to external partners" />
        <DataTable
          columns={[
            { key: 'name', header: 'Name', render: (k) => <div><div className="font-medium text-slate-800">{k.name}</div><div className="text-xs text-slate-400">{k.owner || '—'}</div></div> },
            { key: 'prefix', header: 'Key', className: 'num text-xs text-slate-500', render: (k) => `${k.prefix}…` },
            { key: 'scopes', header: 'Scopes', render: (k) => <div className="flex gap-1">{String(k.scopes || '').split(',').filter(Boolean).map((s) => <Badge key={s} tone="neutral">{s.trim()}</Badge>)}</div> },
            { key: 'active', header: 'Status', render: (k) => <Badge tone={k.active ? 'success' : 'danger'}>{k.active ? 'active' : 'revoked'}</Badge> },
            { key: 'last_used', header: 'Last used', render: (k) => <span className="text-slate-500 text-xs">{k.last_used ? formatDateTime(k.last_used) : 'never'}</span> },
            {
              key: 'actions', header: '', align: 'right',
              render: (k) => k.active ? (
                <Button size="xs" variant="ghost" icon={Trash2} onClick={(e) => { e.stopPropagation(); revoke(k); }}>Revoke</Button>
              ) : null,
            },
          ]}
          rows={keys.loading ? null : (keys.data || [])} loading={keys.loading} error={keys.error} rowKey={(k) => k.key_id} pageSize={8}
          empty={{ icon: KeyRound, title: 'No API keys', description: 'Create a key to give a partner access to the API.', action: <Button icon={Plus} onClick={() => setOpen(true)}>Create API key</Button> }}
        />
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader title="Endpoints" icon={Terminal} subtitle="Public partner API (v1)" />
        <div className="p-4 space-y-2">
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
              <Badge tone={e.method === 'POST' ? 'warning' : 'success'}>{e.method}</Badge>
              <code className="num text-xs text-slate-700 flex-1">{e.path}</code>
              <Badge tone="neutral">scope: {e.scope}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <CreateKeyModal open={open} onClose={() => setOpen(false)} onCreated={(s) => { setSecret(s); keys.reload(); }} />
      <SecretModal secret={secret} onClose={() => setSecret(null)} />
    </div>
  );
}

function CreateKeyModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', owner: '', scopes: ['read'] });
  const [busy, setBusy] = useState(false);
  const toggleScope = (s) => setForm((f) => ({ ...f, scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s] }));

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Enter a name');
    if (!form.scopes.length) return toast.error('Select at least one scope');
    setBusy(true);
    try {
      const res = await ApiKeyApi.create({ name: form.name.trim(), owner: form.owner.trim(), scopes: form.scopes.join(',') });
      onCreated?.(res.secret);
      onClose();
      setForm({ name: '', owner: '', scopes: ['read'] });
    } catch (err) { toast.error(err?.message || 'Could not create key'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create API key" subtitle="Issue credentials to an external partner"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Plus} loading={busy} onClick={submit}>Create key</Button></>}>
      <div className="space-y-4">
        <Field label="Name" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. MTN MoMo integration" /></Field>
        <Field label="Partner / owner"><Input value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} placeholder="e.g. MTN Ghana" /></Field>
        <Field label="Scopes" required>
          <div className="space-y-2">
            {SCOPES.map((s) => (
              <button key={s.key} type="button" onClick={() => toggleScope(s.key)}
                className={cn('w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left', form.scopes.includes(s.key) ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}>
                <div><div className="text-sm font-medium text-slate-700">{s.label}</div><div className="text-xs text-slate-400">{s.desc}</div></div>
                <span className={cn('flex items-center justify-center w-5 h-5 rounded-full', form.scopes.includes(s.key) ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-400')}>{form.scopes.includes(s.key) && <Check size={12} strokeWidth={3} />}</span>
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function SecretModal({ secret, onClose }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  if (!secret) return null;
  const copy = () => { try { navigator.clipboard.writeText(secret); setCopied(true); toast.success('Copied'); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  return (
    <Modal open={!!secret} onClose={onClose} title="API key created" subtitle="Copy it now — it won't be shown again"
      footer={<Button onClick={onClose}>Done</Button>}>
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-warning-700 bg-warning-50 border border-warning-500/20 rounded-md px-3 py-2">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" />
          This secret is shown once. Store it securely; you cannot retrieve it later.
        </div>
        <div className="flex items-center gap-2">
          <code className="num text-xs bg-slate-900 text-slate-100 rounded-md px-3 py-2.5 flex-1 break-all">{secret}</code>
          <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
      </div>
    </Modal>
  );
}
