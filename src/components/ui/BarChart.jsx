import React from 'react';
import { cn } from '../../lib/cn.js';

/**
 * Compact vertical bar chart for time-series (e.g. daily volume).
 * data: [{ label, value, hint? }]
 */
export function BarChart({ data, height = 160, formatValue = (v) => v, className, tone = 'brand' }) {
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  const bar = tone === 'teal' ? 'from-teal-500 to-teal-400' : 'from-brand-600 to-brand-400';

  if (!data.length) return <div className="text-sm text-slate-400 py-10 text-center">No data for this period.</div>;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-1.5 overflow-x-auto scroll-thin" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 min-w-[16px] flex flex-col items-center justify-end h-full group">
            <div className="relative w-full flex items-end justify-center h-full">
              <div
                className={cn('w-full max-w-[36px] rounded-t-md bg-gradient-to-t transition-all', bar)}
                style={{ height: `${Math.max(2, ((d.value || 0) / max) * 100)}%` }}
                title={`${d.label}: ${formatValue(d.value)}`}
              />
              <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity num text-2xs font-medium text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap pointer-events-none z-10">
                {formatValue(d.value)}
              </div>
            </div>
            <div className="mt-1.5 text-2xs text-slate-400 truncate w-full text-center">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
