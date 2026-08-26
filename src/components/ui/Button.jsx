import React from 'react';
import { cn } from '../../lib/cn.js';
import { Spinner } from './Spinner.jsx';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 border border-brand-700/60 shadow-sm',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-slate-300',
  subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 border border-danger-700/60 shadow-sm',
  success: 'bg-success-600 text-white hover:bg-success-700 border border-success-700/60 shadow-sm',
};

const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-base gap-2 rounded-lg',
};

export const Button = React.forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, iconRight: IconRight, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={15} /> : Icon ? <Icon size={16} strokeWidth={2} /> : null}
      {children}
      {IconRight ? <IconRight size={16} strokeWidth={2} /> : null}
    </button>
  );
});
