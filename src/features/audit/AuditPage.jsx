import React, { useMemo, useState } from 'react';
import { ScrollText, Activity, Clock, CalendarDays, ShieldCheck } from 'lucide-react';
import { AuditApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import {
  PageHeader, Card, DataTable, StatCard, Badge,
  Toolbar, ToolbarRow, ToolbarSpacer, SearchInput, SegmentedControl, ResultCount,
} from '../../components/ui/index.js';
import { formatDateTime, formatNumber, initials } from '../../lib/format.js';
import { asList } from '../accounts/accountsData.js';

// Actions look like "TRANSACTION_PROCESS_TRANSACTION_ID:<uuid>" — parse into entity/op/ref.
function parseAction(action = '') {
  const [labelPart, ref] = String(action).split(':');
  const cleaned = labelPart.replace(/_[A-Z]+_ID$/, '');
  const parts = cleaned.split('_').filter(Boolean);
  const entity = parts[0] || 'SYSTEM';
  const op = parts.slice(1).join(' ') || parts[0] || 'ACTION';
  return { entity, op, ref: ref || '', raw: action };
}

const ENTITY_TONE = { TRANSACTION: 'brand', CUSTOMER: 'teal', ACCOUNT: 'info', LOAN: 'warning', CARD: 'neutral', SYSTEM: 'neutral' };

export function AuditPage() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('all');
  const logsQ = useAsync(() => AuditApi.list({ limit: 1000 }).then(asList), []);
  const statsQ = useAsync(() => AuditApi.stats().catch(() => null), []);

  const rows = useMemo(() => {
    const list = (logsQ.data || []).map((l) => ({ ...l, parsed: parseAction(l.action) }));
    const term = q.trim().toLowerCase();
    return list.filter((l) => {
      if (entity !== 'all' && l.parsed.entity !== entity) return false;
      if (term && ![l.action, l.parsed.op, l.parsed.ref, l.performed_by].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))) return false;
      return true;
    });
  }, [logsQ.data, q, entity]);

  const entities = useMemo(() => {
    const set = new Set((logsQ.data || []).map((l) => parseAction(l.action).entity));
    return ['all', ...Array.from(set)];
  }, [logsQ.data]);

  const actorLabel = (id) => (id === user?.user_id ? (user?.username || 'you') : id ? `${id.slice(0, 8)}…` : 'system');

  const columns = [
    {
      key: 'actor', header: 'Actor', width: '190px',
      render: (l) => (
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-900 text-white text-2xs font-semibold shrink-0">{initials(actorLabel(l.performed_by))}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate">{actorLabel(l.performed_by)}</div>
            <div className="num text-2xs text-slate-400 truncate">{(l.performed_by || '').slice(0, 12)}</div>
          </div>
        </div>
      ),
    },
    { key: 'entity', header: 'Module', render: (l) => <Badge tone={ENTITY_TONE[l.parsed.entity] || 'neutral'}>{l.parsed.entity.toLowerCase()}</Badge> },
    { key: 'op', header: 'Action', render: (l) => <span className="capitalize font-medium text-slate-700">{l.parsed.op.toLowerCase()}</span> },
    { key: 'ref', header: 'Reference', className: 'num text-xs text-slate-400', render: (l) => (l.parsed.ref ? l.parsed.ref.slice(0, 16) : '—') },
    { key: 'timestamp', header: 'Timestamp', align: 'right', render: (l) => <span className="text-slate-500">{formatDateTime(l.timestamp)}</span> },
  ];

  return (
    <div>
      <PageHeader title="Audit Trail" description="Immutable record of every action across the bank" />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total events" value={statsQ.data ? formatNumber(statsQ.data.total_logs) : (logsQ.loading ? '—' : (logsQ.data || []).length)} icon={ScrollText} accent="brand" />
        <StatCard label="Today" value={statsQ.data?.today_logs ?? '—'} icon={Activity} accent="teal" />
        <StatCard label="This week" value={statsQ.data?.week_logs ?? '—'} icon={Clock} accent="success" />
        <StatCard label="This month" value={statsQ.data?.month_logs ?? '—'} icon={CalendarDays} accent="slate" />
      </div>

      <Card>
        <Toolbar>
          <ToolbarRow>
            <SegmentedControl
              options={entities.map((e) => ({ value: e, label: e === 'all' ? 'All modules' : e.toLowerCase() }))}
              value={entity} onChange={setEntity} />
            <ToolbarSpacer />
            <ResultCount shown={rows.length} total={(logsQ.data || []).length} noun="events" loading={logsQ.loading} />
            <SearchInput value={q} onChange={setQ} placeholder="Search action, reference, actor…" width="w-72" />
          </ToolbarRow>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={logsQ.loading ? null : rows}
          loading={logsQ.loading}
          error={logsQ.error}
          rowKey={(l) => l.log_id}
          pageSize={25}
          empty={{ icon: ShieldCheck, title: 'No audit events', description: 'Actions across the bank will appear here.' }}
        />
      </Card>

      <div className="flex items-start gap-2 mt-3 text-xs text-slate-400">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        <p>Every state-changing action is recorded with the actor and timestamp. The audit trail is append-only and tamper-evident.</p>
      </div>
    </div>
  );
}
