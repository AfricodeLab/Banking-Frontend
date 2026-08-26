import React from 'react';
import { cn } from '../../lib/cn.js';

const TONES = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-success-50 text-success-700 ring-success-500/25',
  danger: 'bg-danger-50 text-danger-700 ring-danger-500/25',
  warning: 'bg-warning-50 text-warning-700 ring-warning-500/25',
  info: 'bg-info-50 text-info-600 ring-info-500/25',
  teal: 'bg-teal-500/10 text-teal-600 ring-teal-500/25',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide rounded ring-1 ring-inset', TONES[tone], className)}>
      {children}
    </span>
  );
}

// Maps common banking statuses to a tone + label.
const STATUS_MAP = {
  active: 'success', completed: 'success', approved: 'success', verified: 'success', posted: 'success', cleared: 'success',
  pending: 'warning', review: 'warning', processing: 'warning', hold: 'warning', submitted: 'warning',
  inactive: 'neutral', closed: 'neutral', cancelled: 'neutral', draft: 'neutral', dormant: 'neutral',
  failed: 'danger', rejected: 'danger', blocked: 'danger', overdue: 'danger', frozen: 'danger', blacklisted: 'danger', suspended: 'danger',
};

export function StatusPill({ status, className }) {
  const key = String(status || '').toLowerCase();
  const tone = STATUS_MAP[key] || 'neutral';
  return (
    <Badge tone={tone} className={className}>
      <span className={cn('w-1.5 h-1.5 rounded-full',
        tone === 'success' && 'bg-success-500',
        tone === 'warning' && 'bg-warning-500',
        tone === 'danger' && 'bg-danger-500',
        tone === 'neutral' && 'bg-slate-400',
      )} />
      {status || '—'}
    </Badge>
  );
}
