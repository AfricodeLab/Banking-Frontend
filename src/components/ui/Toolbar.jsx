import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/**
 * Toolbar — the standard control strip that sits at the top of a data Card.
 *
 * Layout contract (keeps every list page consistent instead of hand-rolled):
 *   <Toolbar>
 *     <ToolbarRow>            ← primary: views on the left, search on the right
 *       <SegmentedControl .../>
 *       <ToolbarSpacer />
 *       <SearchInput .../>
 *     </ToolbarRow>
 *     <ToolbarFilters onClear={...} active={n}>   ← optional secondary strip for refine-filters
 *       <FilterSelect .../> <DateRangeFilter .../>
 *     </ToolbarFilters>
 *   </Toolbar>
 *
 * Rows never "cram": the primary row holds at most views + search; everything else
 * (status, date range, etc.) drops to the lighter secondary filter strip.
 */
export function Toolbar({ children, className }) {
  return (
    <div className={cn('flex flex-col divide-y divide-slate-100 border-b border-slate-100', className)}>
      {children}
    </div>
  );
}

export function ToolbarRow({ children, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5 px-4 py-2.5', className)}>
      {children}
    </div>
  );
}

/** Pushes everything after it to the right edge of the row. */
export function ToolbarSpacer() {
  return <div className="flex-1 min-w-[8px]" />;
}

/**
 * Secondary filter strip — subtle background, labelled controls, and a
 * "Clear" affordance that only appears when filters are active.
 */
export function ToolbarFilters({ children, active = 0, onClear, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-slate-50/60', className)}>
      <span className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-400">
        <SlidersHorizontal size={13} /> Filters
      </span>
      {children}
      {active > 0 && (
        <button type="button" onClick={onClear}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-danger-600 transition-colors">
          <X size={13} /> Clear{active > 1 ? ` (${active})` : ''}
        </button>
      )}
    </div>
  );
}

/** Search box with leading icon and an inline clear button. onChange receives the string value. */
export const SearchInput = React.forwardRef(function SearchInput(
  { value, onChange, placeholder = 'Search…', className, width = 'w-64' }, ref,
) {
  return (
    <div className={cn('relative', width, className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-8 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 transition-shadow focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
      />
      {value && (
        <button type="button" onClick={() => onChange?.('')} aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
          <X size={14} />
        </button>
      )}
    </div>
  );
});

/**
 * SegmentedControl — pill toggle for a small set of mutually-exclusive views.
 * options: array of strings, or { value, label, icon? }.
 */
export function SegmentedControl({ options, value, onChange, size = 'md', className }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const pad = size === 'sm' ? 'px-2.5 py-1 text-2xs' : 'px-3 py-1.5 text-xs';
  return (
    <div className={cn('inline-flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 max-w-full overflow-x-auto scroll-thin', className)}>
      {opts.map((o) => {
        const Icon = o.icon;
        const on = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-medium capitalize whitespace-nowrap transition-colors',
              pad,
              on ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}>
            {Icon && <Icon size={13} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Compact labelled select for the filter strip. options: [{ value, label }] or strings. */
export function FilterSelect({ label, value, onChange, options, className }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <label className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
      {label && <span className="text-slate-500 whitespace-nowrap">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-8 pl-2.5 pr-7 text-xs bg-white border border-slate-300 rounded-md text-slate-700 capitalize appearance-none bg-no-repeat transition-shadow focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundPosition: 'right 0.4rem center',
        }}>
        {opts.map((o) => <option key={o.value} value={o.value} className="capitalize">{o.label}</option>)}
      </select>
    </label>
  );
}

/** From–to date pair rendered as one grouped control. */
export function DateRangeFilter({ from, to, onFrom, onTo, label = 'Date' }) {
  const input = 'h-8 px-2 text-xs bg-white border border-slate-300 rounded-md text-slate-700 transition-shadow focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25';
  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      {label && <span className="text-slate-500 whitespace-nowrap">{label}</span>}
      <input type="date" value={from} onChange={(e) => onFrom?.(e.target.value)} className={input} aria-label={`${label} from`} />
      <span className="text-slate-300">–</span>
      <input type="date" value={to} onChange={(e) => onTo?.(e.target.value)} className={input} aria-label={`${label} to`} />
    </div>
  );
}

/** Subtle "N of M" result count for a toolbar row. */
export function ResultCount({ shown, total, noun = 'records', loading }) {
  return (
    <span className="text-xs text-slate-400 whitespace-nowrap tabular-nums">
      {loading ? 'Loading…' : total == null ? `${shown} ${noun}` : `${shown} of ${total} ${noun}`}
    </span>
  );
}
