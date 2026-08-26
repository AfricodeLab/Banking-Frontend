import React, { useState } from 'react';
import { cn } from '../../lib/cn.js';
import { Spinner } from './Spinner.jsx';
import { EmptyState } from './EmptyState.jsx';
import { Pagination } from './Pagination.jsx';

/**
 * Dense enterprise data grid with built-in client-side pagination.
 * columns: [{ key, header, align?, width?, className?, render?(row) }]
 * Pagination is filter-safe: the current page is clamped to the (possibly filtered) row count,
 * so shrinking the result set never leaves you stranded on an empty page.
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
  paginate = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = Array.isArray(rows) ? rows.length : 0;
  const usePaging = paginate && total > pageSize;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const pageRows = !Array.isArray(rows)
    ? rows
    : usePaging
      ? rows.slice((current - 1) * pageSize, current * pageSize)
      : rows;

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="relative overflow-auto scroll-thin">
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
            {pageRows && pageRows.map((row, i) => (
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
        {!loading && !error && Array.isArray(rows) && rows.length === 0 && (
          <EmptyState {...(empty || { title: 'No records found' })} />
        )}
      </div>

      {usePaging && !loading && !error && (
        <Pagination
          page={current}
          pageSize={pageSize}
          total={total}
          onPage={setPage}
          onPageSize={(s) => { setPageSize(s); setPage(1); }}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}
