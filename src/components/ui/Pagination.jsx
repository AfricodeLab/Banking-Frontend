import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/**
 * Reusable pager. Works for client-sliced tables and server-paginated lists.
 * When `total` is unknown (server list without a count) pass total={null} and hasMore.
 */
export function Pagination({ page, pageSize, total, onPage, onPageSize, pageSizeOptions = [10, 25, 50, 100], hasMore }) {
  const known = total != null;
  const pages = known ? Math.max(1, Math.ceil(total / pageSize)) : null;
  const start = known ? (total === 0 ? 0 : (page - 1) * pageSize + 1) : (page - 1) * pageSize + 1;
  const end = known ? Math.min(page * pageSize, total) : page * pageSize;
  const canPrev = page > 1;
  const canNext = known ? page < pages : hasMore;

  const btn = 'flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500">
      {onPageSize && (
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="h-7 pl-2 pr-6 rounded-md border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-brand-500"
          >
            {pageSizeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )}
      <div className="flex items-center gap-3 sm:ml-auto">
        <span className="num tabular-nums">{start}–{end}{known ? ` of ${total}` : ''}</span>
        <div className="flex items-center gap-0.5">
          {known && <button className={btn} disabled={!canPrev} onClick={() => onPage(1)} aria-label="First page"><ChevronsLeft size={15} /></button>}
          <button className={btn} disabled={!canPrev} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
          <span className="num px-1.5 text-slate-600">{page}{known ? ` / ${pages}` : ''}</span>
          <button className={btn} disabled={!canNext} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
          {known && <button className={btn} disabled={!canNext} onClick={() => onPage(pages)} aria-label="Last page"><ChevronsRight size={15} /></button>}
        </div>
      </div>
    </div>
  );
}
