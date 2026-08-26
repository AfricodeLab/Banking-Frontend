import React from 'react';
import { cn } from '../../lib/cn.js';

const TONE_BAR = {
  brand: 'bg-brand-500', teal: 'bg-teal-500', success: 'bg-success-500',
  warning: 'bg-warning-500', danger: 'bg-danger-500', slate: 'bg-slate-400',
};

/**
 * Horizontal distribution bars for a small set of categories.
 * items: [{ label, value, tone, display? }]
 */
export function MiniBars({ items, className }) {
  const max = Math.max(1, ...items.map((i) => i.value || 0));
  return (
    <div className={cn('space-y-2.5', className)}>
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600 capitalize">{it.label}</span>
            <span className="num text-slate-500">{it.display ?? it.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', TONE_BAR[it.tone] || TONE_BAR.brand)}
              style={{ width: `${Math.max(3, Math.round(((it.value || 0) / max) * 100))}%` }} />
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-slate-400 py-2">No data yet.</p>}
    </div>
  );
}
