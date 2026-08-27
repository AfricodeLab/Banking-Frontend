import React from 'react';
import { NavLink } from 'react-router-dom';
import { Landmark, ChevronsLeft } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { NAV_GROUPS } from '../../app/nav.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';

export function Sidebar({ collapsed, onToggle }) {
  const { can } = useAuth();
  // Hide nav items the user lacks permission for, then drop any now-empty groups.
  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.permission || can(it.permission)) }))
    .filter((g) => g.items.length > 0);
  return (
    <aside
      className={cn(
        'flex flex-col bg-navy-900 text-slate-300 shrink-0 transition-[width] duration-200 ease-out',
        collapsed ? 'w-[68px]' : 'w-[248px]',
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center h-14 px-4 border-b border-white/5', collapsed && 'justify-center px-0')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-teal-500 text-white shadow-sm shrink-0">
            <Landmark size={19} />
          </span>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="text-[15px] font-semibold text-white tracking-tight">AfriCore</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">AfricodeLab</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-thin py-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {group.label}
              </div>
            )}
            {collapsed && <div className="mx-3 my-2 border-t border-white/5" />}
            <ul className="px-2 space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-brand-500/15 text-white ring-1 ring-inset ring-brand-400/30'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={18} className={cn('shrink-0', isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300')} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className={cn('flex items-center gap-2 h-11 px-4 border-t border-white/5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors', collapsed && 'justify-center px-0')}
      >
        <ChevronsLeft size={18} className={cn('transition-transform', collapsed && 'rotate-180')} />
        {!collapsed && <span className="text-xs font-medium">Collapse</span>}
      </button>
    </aside>
  );
}
