import React, { useMemo, useState } from 'react';
import { Plus, Search, Building2, MapPin, Clock, Phone, Network } from 'lucide-react';
import { BranchApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { PageHeader, Card, DataTable, Button, Input, StatCard, Modal, Field, useToast } from '../../components/ui/index.js';
import { asList } from '../accounts/accountsData.js';

export function BranchesListPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const branches = useAsync(() => BranchApi.list().then(asList), []);
  const stats = useAsync(() => BranchApi.stats().catch(() => null), []);

  const list = branches.data || [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((b) => [b.location, b.contact_number].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
  }, [list, q]);

  const columns = [
    {
      key: 'location', header: 'Branch',
      render: (b) => (
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-600 shrink-0"><Building2 size={16} /></span>
          <div className="min-w-0">
            <div className="font-medium text-slate-800 truncate">{b.location}</div>
            <div className="num text-xs text-slate-400 truncate">{(b.branch_id || '').slice(0, 12)}</div>
          </div>
        </div>
      ),
    },
    { key: 'operating_hours', header: 'Operating hours', render: (b) => <span className="inline-flex items-center gap-1.5 text-slate-600"><Clock size={13} className="text-slate-400" />{b.operating_hours || '—'}</span> },
    { key: 'contact_number', header: 'Contact', className: 'num text-xs', render: (b) => <span className="inline-flex items-center gap-1.5 text-slate-600"><Phone size={13} className="text-slate-400" />{b.contact_number || '—'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Branches" description="Branch network directory"
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>New branch</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Total branches" value={branches.loading ? '—' : list.length} icon={Building2} accent="brand" />
        <StatCard label="Locations" value={stats.data?.unique_locations ?? '—'} icon={MapPin} accent="teal" footer="Distinct cities" />
        <StatCard label="Network" value={stats.data?.total_branches ?? list.length} icon={Network} accent="success" footer="Operating units" />
      </div>

      <Card>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search location or contact…" className="pl-9" />
          </div>
          <div className="ml-auto text-xs text-slate-400">{branches.loading ? 'Loading…' : `${rows.length} branches`}</div>
        </div>
        <DataTable columns={columns} rows={branches.loading ? null : rows} loading={branches.loading} error={branches.error}
          rowKey={(b) => b.branch_id}
          empty={{ icon: Building2, title: 'No branches', description: 'Add your first branch.', action: <Button icon={Plus} onClick={() => setOpen(true)}>New branch</Button> }} />
      </Card>

      <NewBranchModal open={open} onClose={() => setOpen(false)} onCreated={() => { branches.reload(); stats.reload(); }} />
    </div>
  );
}

function NewBranchModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ location: '', operating_hours: '9:00 AM - 5:00 PM', contact_number: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.location.trim()) return toast.error('Enter a branch location');
    setBusy(true);
    try {
      await BranchApi.create(form);
      toast.success('Branch created', { title: form.location });
      onCreated?.();
      onClose();
      setForm({ location: '', operating_hours: '9:00 AM - 5:00 PM', contact_number: '' });
    } catch (err) { toast.error(err?.message || 'Could not create branch'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New branch" subtitle="Add a branch to the network"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Plus} loading={busy} onClick={submit}>Create branch</Button></>}>
      <div className="space-y-4">
        <Field label="Location" required>
          <Input value={form.location} onChange={set('location')} placeholder="e.g. Kumasi Central" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Operating hours"><Input value={form.operating_hours} onChange={set('operating_hours')} /></Field>
          <Field label="Contact number"><Input value={form.contact_number} onChange={set('contact_number')} mono placeholder="+233…" /></Field>
        </div>
      </div>
    </Modal>
  );
}
