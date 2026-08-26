import React from 'react';
import { cn } from '../../lib/cn.js';

export function Card({ className, children, ...props }) {
  return <div className={cn('card', className)} {...props}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions, icon: Icon, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100', className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-brand-50 text-brand-600">
            <Icon size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}
