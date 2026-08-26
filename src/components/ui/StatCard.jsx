import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const ACCENTS = {
  brand: 'bg-brand-50 text-brand-600',
  teal: 'bg-teal-500/10 text-teal-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  slate: 'bg-slate-100 text-slate-500',
};

export function StatCard({ label, value, icon: Icon, accent = 'brand', delta, deltaLabel, mono = true, footer }) {
  const up = typeof delta === 'number' ? delta >= 0 : null;
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {Icon && <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg', ACCENTS[accent])}><Icon size={16} /></span>}
      </div>
      <div className={cn('text-2xl font-semibold text-slate-900 leading-none', mono && 'num')}>{value}</div>
      {(delta !== undefined || footer) && (
        <div className="flex items-center gap-1.5 text-xs">
          {delta !== undefined && (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', up ? 'text-success-600' : 'text-danger-600')}>
              {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(delta)}%
            </span>
          )}
          {(deltaLabel || footer) && <span className="text-slate-400">{deltaLabel || footer}</span>}
        </div>
      )}
    </div>
  );
}
