import React, { useMemo, useState } from 'react';
import {
  ShieldCheck, UserCog, KeyRound, Building2, Plus, Trash2, Check, Users2, Search, RotateCcw, Smartphone, Gauge,
} from 'lucide-react';
import { RoleApi, PermissionApi, UserApi, BranchApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { asList } from '../accounts/accountsData.js';
import {
  PageHeader, Card, CardHeader, Tabs, Badge, Button, Input, Select, Field, Modal, DataTable,
  StatusPill, Spinner, EmptyState, useToast, useConfirm,
} from '../../components/ui/index.js';
import { formatDate, formatMoney, initials } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const DEPARTMENTS = [
  'Executive', 'Operations', 'Branch Operations', 'Lending & Credit', 'Compliance & Risk',
  'Customer Service', 'Treasury & FX', 'Internal Audit', 'IT', 'Finance', 'External',
];

function parsePerm(name = '') {
  const parts = String(name).split('_');
  if (parts.length < 2) return { action: name, resource: 'system' };
  return { action: parts[0], resource: parts.slice(1).join(' ') };
}

export function UsersRolesPage() {
  const [tab, setTab] = useState('roles');
  return (
    <div>
      <PageHeader title="Users & Roles" description="Access control — departments, roles, permissions and staff (RBAC)" />
      <Tabs value={tab} onChange={setTab} className="mb-4"
        tabs={[{ value: 'roles', label: 'Roles & Departments' }, { value: 'permissions', label: 'Permissions' }, { value: 'staff', label: 'Staff' }]} />
      {tab === 'roles' && <RolesTab />}
      {tab === 'permissions' && <PermissionsTab />}
      {tab === 'staff' && <StaffTab />}
    </div>
  );
}

function RolesTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const roles = useAsync(() => RoleApi.list().then(asList), []);
  const perms = useAsync(() => PermissionApi.list().then(asList), []);
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busyPerm, setBusyPerm] = useState(null);

  const roleList = roles.data || [];
  const selectedRole = roleList.find((r) => r.role_id === selected) || null;
  const rolePerms = useAsync(() => (selected ? RoleApi.permissions(selected).then(asList) : Promise.resolve([])), [selected]);
  const assigned = useMemo(() => new Set((rolePerms.data || []).map((p) => p.permission_id)), [rolePerms.data]);

  const byDept = useMemo(() => {
    const map = {};
    roleList.forEach((r) => { const d = r.department || 'Unassigned'; (map[d] = map[d] || []).push(r); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [roleList]);

  const permGroups = useMemo(() => {
    const map = {};
    (perms.data || []).forEach((p) => { const { resource } = parsePerm(p.permission_name); (map[resource] = map[resource] || []).push(p); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [perms.data]);

  const toggle = async (p) => {
    if (!selected) return;
    setBusyPerm(p.permission_id);
    try {
      if (assigned.has(p.permission_id)) await RoleApi.removePermission(selected, p.permission_id);
      else await RoleApi.assignPermission(selected, p.permission_id);
      await rolePerms.reload();
    } catch (err) { toast.error(err?.message || 'Could not update permission'); }
    finally { setBusyPerm(null); }
  };

  const removeRole = async (r) => {
    const ok = await confirm({ title: 'Delete role?', message: `Delete the “${r.role_name}” role? Staff assigned to it will lose its permissions.`, confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try { await RoleApi.remove(r.role_id); toast.success('Role deleted'); if (selected === r.role_id) setSelected(null); roles.reload(); }
    catch (err) { toast.error(err?.message || 'Could not delete'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* Roles by department */}
      <Card className="self-start">
        <CardHeader title="Roles by department" icon={Building2} actions={<Button size="xs" icon={Plus} onClick={() => setAddOpen(true)}>New</Button>} />
        <div className="max-h-[560px] overflow-y-auto scroll-thin p-2">
          {roles.loading && <div className="p-4 text-sm text-slate-400 flex items-center gap-2"><Spinner size={15} /> Loading…</div>}
          {byDept.map(([dept, rs]) => (
            <div key={dept} className="mb-1">
              <div className="px-2 pt-2 pb-1 text-2xs font-semibold uppercase tracking-wide text-slate-400">{dept}</div>
              {rs.map((r) => (
                <button key={r.role_id} onClick={() => setSelected(r.role_id)}
                  className={cn('group w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors', selected === r.role_id ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-slate-50')}>
                  <UserCog size={15} className={selected === r.role_id ? 'text-brand-600' : 'text-slate-400'} />
                  <span className="text-sm font-medium text-slate-700 capitalize flex-1 truncate">{String(r.role_name).replace(/_/g, ' ')}</span>
                  <Trash2 size={14} className="text-slate-300 hover:text-danger-500 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeRole(r); }} />
                </button>
              ))}
            </div>
          ))}
        </div>
      </Card>

      {/* Permission matrix */}
      <Card>
        {!selectedRole ? (
          <EmptyState icon={ShieldCheck} title="Select a role" description="Pick a role to view and manage its permissions." />
        ) : (
          <>
            <CardHeader title={<span className="capitalize">{String(selectedRole.role_name).replace(/_/g, ' ')}</span>} subtitle={`${selectedRole.department || 'Unassigned'} · ${assigned.size} permissions`} icon={ShieldCheck}
              actions={<Badge tone="brand">{selectedRole.department || '—'}</Badge>} />
            <div className="p-4">
              {perms.loading || rolePerms.loading ? (
                <div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><Spinner size={16} /> Loading permissions…</div>
              ) : (
                <div className="space-y-5">
                  {permGroups.map(([resource, ps]) => (
                    <div key={resource}>
                      <div className="text-xs font-semibold text-slate-500 capitalize mb-2">{resource}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ps.map((p) => {
                          const on = assigned.has(p.permission_id);
                          return (
                            <button key={p.permission_id} onClick={() => toggle(p)} disabled={busyPerm === p.permission_id}
                              className={cn('flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors', on ? 'border-success-500/30 bg-success-50' : 'border-slate-200 hover:bg-slate-50')}>
                              <span className="text-sm text-slate-700 capitalize">{parsePerm(p.permission_name).action} {resource}</span>
                              <span className={cn('flex items-center justify-center w-5 h-5 rounded-full shrink-0', on ? 'bg-success-500 text-white' : 'bg-slate-200 text-slate-400')}>{on && <Check size={12} strokeWidth={3} />}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <NewRoleModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => roles.reload()} />
    </div>
  );
}

function NewRoleModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ role_name: '', department: 'Operations' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.role_name.trim()) return toast.error('Enter a role name');
    setBusy(true);
    try {
      await RoleApi.create({ role_name: form.role_name.trim().toLowerCase().replace(/\s+/g, '_'), department: form.department });
      toast.success('Role created'); onCreated?.(); onClose(); setForm({ role_name: '', department: 'Operations' });
    } catch (err) { toast.error(err?.message || 'Could not create role'); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="New role" subtitle="Create a role within a department"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Plus} loading={busy} onClick={submit}>Create role</Button></>}>
      <div className="space-y-4">
        <Field label="Role name" required><Input value={form.role_name} onChange={(e) => setForm((f) => ({ ...f, role_name: e.target.value }))} placeholder="e.g. Relationship Officer" /></Field>
        <Field label="Department" required><Select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
      </div>
    </Modal>
  );
}

function PermissionsTab() {
  const perms = useAsync(() => PermissionApi.list().then(asList), []);
  const groups = useMemo(() => {
    const map = {};
    (perms.data || []).forEach((p) => { const { resource } = parsePerm(p.permission_name); (map[resource] = map[resource] || []).push(p); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [perms.data]);

  return (
    <Card>
      <CardHeader title="Permission catalog" icon={KeyRound} subtitle={`${(perms.data || []).length} system permissions`} />
      <div className="p-4">
        {perms.loading ? <div className="flex items-center gap-2 text-slate-400 py-8 justify-center"><Spinner size={16} /> Loading…</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(([resource, ps]) => (
              <div key={resource} className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-700 capitalize mb-2">{resource}</div>
                <div className="flex flex-wrap gap-1.5">
                  {ps.map((p) => <Badge key={p.permission_id} tone="neutral">{parsePerm(p.permission_name).action}</Badge>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function StaffTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me, isAdmin } = useAuth();
  const [q, setQ] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [limitFor, setLimitFor] = useState(null);
  const users = useAsync(() => UserApi.list().then(asList), []);
  const list = users.data || [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((u) => [u.username, u.email, u.role_name, u.department].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
  }, [list, q]);

  const setRequire = async (u, required) => {
    try {
      await UserApi.requireMfa(u.user_id, required);
      toast.success(required ? 'MFA now required' : 'MFA no longer required', { title: u.username });
      users.reload();
    } catch (err) { toast.error(err?.message || 'Could not update'); }
  };

  const requireAll = async () => {
    const ok = await confirm({
      title: 'Require MFA for all staff?',
      message: 'Every staff member will be required to set up two-factor authentication. Those who haven’t enrolled will be prompted to do so at their next sign-in.',
      confirmLabel: 'Require for all',
    });
    if (!ok) return;
    try {
      await UserApi.requireMfaAll(true);
      toast.success('MFA required for all staff');
      users.reload();
    } catch (err) { toast.error(err?.message || 'Could not update'); }
  };

  const resetMfa = async (u) => {
    const ok = await confirm({
      title: 'Reset this user’s MFA?',
      message: `Clear two-factor for ${u.username}? They'll be able to enrol a new device the next time they sign in. Use this if they lost their authenticator.`,
      confirmLabel: 'Reset MFA', tone: 'danger',
    });
    if (!ok) return;
    try {
      await UserApi.resetMfa(u.user_id);
      toast.success('MFA reset', { title: u.username });
      users.reload();
    } catch (err) { toast.error(err?.message || 'Could not reset'); }
  };

  const mfaCell = (u) => (
    u.mfa_enabled
      ? <Badge tone="success">on</Badge>
      : u.mfa_required
        ? <Badge tone="warning">required · not set</Badge>
        : <Badge tone="neutral">off</Badge>
  );

  const columns = [
    {
      key: 'user', header: 'Staff',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-900 text-white text-2xs font-semibold shrink-0">{initials(`${u.first_name || ''} ${u.last_name || u.username}`)}</span>
          <div className="min-w-0"><div className="font-medium text-slate-800 truncate">{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username}</div><div className="text-xs text-slate-400 truncate">{u.email || u.username}</div></div>
        </div>
      ),
    },
    { key: 'role_name', header: 'Role', render: (u) => <span className="capitalize">{String(u.role_name || '—').replace(/_/g, ' ')}</span> },
    { key: 'department', header: 'Department', render: (u) => <Badge tone="brand">{u.department || '—'}</Badge> },
    { key: 'is_active', header: 'Status', render: (u) => <StatusPill status={u.is_active ? 'active' : 'inactive'} /> },
    { key: 'mfa', header: <span className="inline-flex items-center gap-1"><Smartphone size={12} /> MFA</span>, render: mfaCell },
    { key: 'teller_limit', header: 'Teller limit', align: 'right', render: (u) => <span className="num text-xs text-slate-500">{Number(u.teller_limit) > 0 ? formatMoney(u.teller_limit, 'GHS') : 'none'}</span> },
  ];
  if (isAdmin) {
    columns.push({
      key: 'mfa_actions', header: '', align: 'right', width: '280px',
      render: (u) => {
        const isSelf = u.user_id === me?.user_id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="xs" variant="ghost" icon={Gauge} onClick={() => setLimitFor(u)}>Limit</Button>
            {u.mfa_required
              ? <Button size="xs" variant="ghost" onClick={() => setRequire(u, false)} disabled={isSelf} title={isSelf ? 'You cannot change your own requirement here' : undefined}>Unrequire</Button>
              : <Button size="xs" variant="ghost" icon={ShieldCheck} onClick={() => setRequire(u, true)}>Require</Button>}
            {u.mfa_enabled && !isSelf && <Button size="xs" variant="ghost" icon={RotateCcw} onClick={() => resetMfa(u)}>Reset</Button>}
          </div>
        );
      },
    });
  } else {
    columns.push({ key: 'created_at', header: 'Added', align: 'right', render: (u) => <span className="text-slate-500 text-xs">{formatDate(u.created_at)}</span> });
  }

  return (
    <Card>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff, role, department…" className="pl-9" />
        </div>
        {isAdmin && <Button variant="secondary" icon={ShieldCheck} onClick={requireAll}>Require MFA for all</Button>}
        <Button icon={Plus} onClick={() => setAddOpen(true)}>Add staff</Button>
      </div>
      <DataTable
        columns={columns}
        rows={users.loading ? null : rows} loading={users.loading} error={users.error} rowKey={(u) => u.user_id} pageSize={12}
        empty={{ icon: Users2, title: 'No staff users', description: 'Add a staff member to grant them access.' }}
      />
      <AddStaffModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => users.reload()} />
      <TellerLimitModal staff={limitFor} onClose={() => setLimitFor(null)} onSaved={() => { setLimitFor(null); users.reload(); }} />
    </Card>
  );
}

function TellerLimitModal({ staff, onClose, onSaved }) {
  const toast = useToast();
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { if (staff) setLimit(String(Number(staff.teller_limit) || 0)); }, [staff]);
  if (!staff) return null;

  const submit = async () => {
    const n = parseFloat(limit || '0');
    if (Number.isNaN(n) || n < 0) return toast.error('Enter a valid amount (0 = no limit)');
    setBusy(true);
    try {
      await UserApi.setTellerLimit(staff.user_id, String(n.toFixed(2)));
      toast.success('Teller limit updated', { title: staff.username });
      onSaved?.();
    } catch (err) { toast.error(err?.message || 'Could not update limit'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Teller cash limit" subtitle={`${staff.username} — max single cash transaction before supervisor approval`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Save limit</Button></>}>
      <Field label="Per-transaction limit (GHS)" hint="Enter 0 for no personal limit (the global approval threshold still applies).">
        <Input type="number" step="0.01" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} mono placeholder="0.00" />
      </Field>
    </Modal>
  );
}

function AddStaffModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const roles = useAsync(() => RoleApi.list().then(asList), [], { immediate: open });
  const [form, setForm] = useState({ username: '', password: '', email: '', first_name: '', last_name: '', role_id: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.username.trim() || form.username.length < 3) return toast.error('Username must be at least 3 characters');
    if (!form.password || form.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return toast.error('Enter a valid email');
    setBusy(true);
    try {
      await UserApi.register(form);
      toast.success('Staff member added', { title: form.username });
      onCreated?.(); onClose();
      setForm({ username: '', password: '', email: '', first_name: '', last_name: '', role_id: '' });
    } catch (err) { toast.error(err?.message || 'Could not add staff'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add staff member" subtitle="Create a staff login and assign a role"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Plus} loading={busy} onClick={submit}>Add staff</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name"><Input value={form.first_name} onChange={set('first_name')} /></Field>
          <Field label="Last name"><Input value={form.last_name} onChange={set('last_name')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Username" required><Input value={form.username} onChange={set('username')} placeholder="e.g. akua.d" /></Field>
          <Field label="Email" required><Input type="email" value={form.email} onChange={set('email')} placeholder="name@africodelab.com" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Password" required hint="min 8 characters"><Input type="password" value={form.password} onChange={set('password')} /></Field>
          <Field label="Role"><Select value={form.role_id} onChange={set('role_id')}><option value="">Default</option>{(roles.data || []).map((r) => <option key={r.role_id} value={r.role_id}>{String(r.role_name).replace(/_/g, ' ')} · {r.department}</option>)}</Select></Field>
        </div>
      </div>
    </Modal>
  );
}
