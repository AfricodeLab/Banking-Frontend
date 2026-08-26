import React from 'react';
import { cn } from '../../lib/cn.js';

const baseControl =
  'w-full h-9 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 ' +
  'transition-shadow focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 ' +
  'disabled:bg-slate-50 disabled:text-slate-500';

export function Label({ children, htmlFor, required, className }) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-xs font-medium text-slate-600 mb-1', className)}>
      {children}
      {required && <span className="text-danger-500 ml-0.5">*</span>}
    </label>
  );
}

export function Field({ label, htmlFor, required, error, hint, children, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && <Label htmlFor={htmlFor} required={required}>{label}</Label>}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef(function Input({ className, invalid, mono, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(baseControl, mono && 'num', invalid && 'border-danger-400 focus:border-danger-500 focus:ring-danger-500/25', className)}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return (
    <textarea ref={ref} rows={rows} className={cn(baseControl, 'h-auto py-2 resize-y', className)} {...props} />
  );
});

export const Select = React.forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(baseControl, 'pr-8 appearance-none bg-no-repeat', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 0.5rem center',
      }}
      {...props}
    >
      {children}
    </select>
  );
});
