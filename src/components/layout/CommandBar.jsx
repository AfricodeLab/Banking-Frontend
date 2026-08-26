import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, User, ArrowRight } from 'lucide-react';
import { CustomerApi } from '../../lib/api/index.js';
import { NAV_INDEX } from '../../app/nav.js';
import { initials } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

/**
 * Global command palette — the spine of the console.
 * In core banking, every task starts by finding a customer, account, or screen.
 * Open with the top-bar search, Cmd/Ctrl+K, or "/".
 */
export function CommandBar({ open, onClose }) {
  const [q, setQ] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQ(''); setCustomers([]); setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  // Debounced customer search against the live backend.
  useEffect(() => {
    if (!open) return undefined;
    const term = q.trim();
    if (!term) { setCustomers([]); return undefined; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const rows = await CustomerApi.list({ limit: 50 });
        const list = Array.isArray(rows) ? rows : rows?.data || [];
        const filtered = list.filter((c) =>
          [c.name, c.email, c.phone, c.customer_id].filter(Boolean).some((v) => String(v).toLowerCase().includes(term.toLowerCase())),
        ).slice(0, 6);
        setCustomers(filtered);
      } catch { setCustomers([]); } finally { setLoading(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  const pages = useMemo(() => {
    const term = q.trim().toLowerCase();
    return NAV_INDEX.filter((n) => !term || n.label.toLowerCase().includes(term)).slice(0, 6);
  }, [q]);

  const results = useMemo(() => [
    ...customers.map((c) => ({ type: 'customer', id: c.customer_id, title: c.name, sub: c.email || c.phone || c.customer_id, to: `/customers/${c.customer_id}` })),
    ...pages.map((p) => ({ type: 'page', id: p.to, title: p.label, sub: 'Go to screen', to: p.to, icon: p.icon })),
  ], [customers, pages]);

  const go = (item) => { if (item) { navigate(item.to); onClose(); } };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { onClose(); }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <div className="fixed inset-0 bg-navy-950/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-pop border border-slate-200 overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search customers, or jump to a screen…"
            className="flex-1 h-14 bg-transparent text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline text-[10px] font-medium text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto scroll-thin py-2">
          {loading && <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>}
          {!loading && q && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">No matches for “{q}”.</div>
          )}
          {!q && (
            <div className="px-4 py-3 text-xs text-slate-400">Type to search the customer file, or pick a screen below.</div>
          )}

          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r)}
              className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left', i === active ? 'bg-brand-50' : 'hover:bg-slate-50')}
            >
              <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', r.type === 'customer' ? 'bg-teal-500/10 text-teal-600' : 'bg-slate-100 text-slate-500')}>
                {r.type === 'customer' ? <span className="text-xs font-semibold">{initials(r.title)}</span> : (r.icon ? <r.icon size={16} /> : <ArrowRight size={16} />)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-800 truncate">{r.title}</span>
                <span className="block text-xs text-slate-400 truncate">{r.sub}</span>
              </span>
              {i === active && <CornerDownLeft size={15} className="text-slate-300 shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
