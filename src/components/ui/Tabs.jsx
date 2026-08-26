import React from 'react';
import { cn } from '../../lib/cn.js';

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-slate-200', className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative px-3.5 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors',
              active ? 'text-brand-700 border-brand-600' : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn('ml-1.5 px-1.5 py-0.5 text-2xs rounded-full', active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
