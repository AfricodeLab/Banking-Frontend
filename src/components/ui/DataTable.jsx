import React from 'react';
import { cn } from '../../lib/cn.js';
import { Spinner } from './Spinner.jsx';
import { EmptyState } from './EmptyState.jsx';

/**
 * Dense enterprise data grid.
 * columns: [{ key, header, align?, width?, className?, render?(row) }]
 */
export function DataTable({
  columns,
  rows,
  loading,
  error,
  empty,
  onRowClick,
  rowKey = (r, i) => r.id ?? i,
  className,
}) {
  return (
    <div className={cn('relative overflow-auto scroll-thin', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-y border-slate-200">
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  'px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap',
                  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows && rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn('grid-row', onRowClick && 'cursor-pointer')}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-3 py-2.5 text-slate-700 align-middle',
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                    c.className,
                  )}
                >
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-sm">
          <Spinner size={18} /> Loading…
        </div>
      )}
      {!loading && error && (
        <div className="py-8 px-4 text-center text-sm text-danger-600 bg-danger-50/40">{String(error.message || error)}</div>
      )}
      {!loading && !error && rows && rows.length === 0 && (
        <EmptyState {...(empty || { title: 'No records found' })} />
      )}
    </div>
  );
}
