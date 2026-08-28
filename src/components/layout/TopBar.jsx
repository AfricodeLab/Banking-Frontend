import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, LogOut, Building2, CircleDot, ShieldCheck, CheckCheck, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { SystemApi, NotificationApi } from '../../lib/api/index.js';
import { initials, formatDateTime } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

export function TopBar({ onOpenCommand }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const poll = () => NotificationApi.unreadCount().then((r) => alive && setUnread(r?.unread || 0)).catch(() => {});
    poll();
    const t = setInterval(poll, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const openNotifs = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      try { const r = await NotificationApi.list(); setNotifs(r?.notifications || []); setUnread(r?.unread || 0); } catch { /* ignore */ }
    }
  };
  const markAll = async () => { try { await NotificationApi.markAllRead(); setNotifs((n) => n.map((x) => ({ ...x, read: true }))); setUnread(0); } catch { /* ignore */ } };
  const openNotif = async (n) => {
    if (!n.read) { try { await NotificationApi.markRead(n.notification_id); } catch { /* ignore */ } setUnread((u) => Math.max(0, u - 1)); }
    setNotifOpen(false);
    if (n.entity_type === 'transaction') navigate('/transactions');
  };

  useEffect(() => {
    let alive = true;
    const check = () => SystemApi.health().then((h) => alive && setHealth(h?.status || 'up')).catch(() => alive && setHealth('down'));
    check();
    const t = setInterval(check, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const now = new Date();
  const healthTone = health === 'healthy' || health === 'up' ? 'text-success-500'
    : health === 'degraded' ? 'text-warning-500' : 'text-danger-500';

  return (
    <header className="flex items-center gap-3 h-14 px-4 bg-white border-b border-slate-200 shrink-0">
      {/* Global command / search */}
      <button
        onClick={onOpenCommand}
        className="flex items-center gap-2.5 h-9 w-full max-w-md px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-white transition-colors"
      >
        <Search size={16} />
        <span className="text-sm">Search customer, account, or screen…</span>
        <kbd className="ml-auto text-[10px] font-medium text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-white">⌘K</kbd>
      </button>

      <div className="flex-1" />

      {/* Branch + business date */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500 pr-2 mr-1 border-r border-slate-200">
        <span className="inline-flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" /> Accra Main</span>
        <span className="inline-flex items-center gap-1.5">
          <CircleDot size={12} className={healthTone} />
          API {health || '…'}
        </span>
        <span className="num text-slate-400">{now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button onClick={openNotifs} className="relative p-2 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-lg shadow-pop border border-slate-200 py-1 animate-scale-in z-50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {notifs.some((n) => !n.read) && (
                <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"><CheckCheck size={13} /> Mark all read</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto scroll-thin">
              {notifs.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-slate-400">You're all caught up.</div>
              ) : notifs.map((n) => {
                const Icon = n.type === 'success' ? CheckCircle2 : n.type === 'warning' || n.type === 'alert' ? AlertTriangle : Info;
                const tone = n.type === 'success' ? 'text-success-500' : n.type === 'warning' || n.type === 'alert' ? 'text-warning-500' : 'text-brand-500';
                return (
                  <button key={n.notification_id} onClick={() => openNotif(n)}
                    className={cn('w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0', !n.read && 'bg-brand-50/40')}>
                    <Icon size={16} className={cn('mt-0.5 shrink-0', tone)} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{n.title}</div>
                      <div className="text-xs text-slate-500 line-clamp-2">{n.body}</div>
                      <div className="text-2xs text-slate-400 mt-0.5">{formatDateTime(n.created_at)}</div>
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-md hover:bg-slate-100">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-teal-500 text-white text-xs font-semibold">
            {initials(`${user?.first_name || ''} ${user?.last_name || user?.username || 'U'}`)}
          </span>
          <span className="hidden md:block text-left leading-tight">
            <span className="block text-sm font-medium text-slate-700">{user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}</span>
            <span className="block text-2xs text-slate-400">Administrator</span>
          </span>
          <ChevronDown size={15} className="text-slate-400" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-lg shadow-pop border border-slate-200 py-1.5 animate-scale-in z-50">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-800 truncate">{user?.username}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => { setMenuOpen(false); navigate('/settings/security'); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <ShieldCheck size={16} className="text-slate-400" /> Security
            </button>
            <button
              onClick={() => { setMenuOpen(false); logout(); navigate('/login'); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
