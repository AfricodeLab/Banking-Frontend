import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { shortId } from '../../lib/format.js';

const LeafContext = createContext(null);

/** Provider that lets a detail page name the current leaf crumb (e.g. a customer name). */
export function BreadcrumbProvider({ children }) {
  const [leaf, setLeaf] = useState(null);
  return <LeafContext.Provider value={{ leaf, setLeaf }}>{children}</LeafContext.Provider>;
}

/** Detail pages call this to label the last crumb with a human name. */
export function useLeafCrumb(label) {
  const ctx = useContext(LeafContext);
  useEffect(() => {
    ctx?.setLeaf(label || null);
    return () => ctx?.setLeaf(null);
  }, [label]); // eslint-disable-line react-hooks/exhaustive-deps
}

const LABELS = {
  customers: 'Customers', accounts: 'Accounts', teller: 'Teller', loans: 'Loans',
  deposits: 'Term Deposits', payments: 'Payments', transactions: 'Transactions',
  cards: 'Cards', compliance: 'Compliance', branches: 'Branches', admin: 'Administration',
  users: 'Users & Roles', audit: 'Audit Trail', reports: 'Reports', fx: 'Foreign Exchange',
  new: 'New',
};

const looksLikeId = (s) => s.length >= 12 || /\d/.test(s) && s.includes('-');

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const ctx = useContext(LeafContext);

  const crumbs = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    const trail = [{ label: 'Dashboard', to: '/', home: true }];
    let acc = '';
    parts.forEach((seg, i) => {
      acc += `/${seg}`;
      const isLast = i === parts.length - 1;
      let label = LABELS[seg] || (looksLikeId(seg) ? shortId(seg) : seg.replace(/(^|\s)\S/g, (c) => c.toUpperCase()));
      if (isLast && ctx?.leaf) label = ctx.leaf;
      trail.push({ label, to: acc });
    });
    return trail;
  }, [pathname, ctx?.leaf]);

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-slate-400 mb-3" aria-label="Breadcrumb">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <React.Fragment key={c.to}>
            {i > 0 && <ChevronRight size={13} className="text-slate-300" />}
            {last ? (
              <span className="text-slate-600 font-medium truncate max-w-[240px]">{c.label}</span>
            ) : (
              <Link to={c.to} className="hover:text-brand-600 inline-flex items-center gap-1 transition-colors">
                {c.home && <Home size={12} />}{c.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
