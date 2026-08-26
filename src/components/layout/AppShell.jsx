import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { TopBar } from './TopBar.jsx';
import { CommandBar } from './CommandBar.jsx';
import { BreadcrumbProvider, Breadcrumbs } from './Breadcrumbs.jsx';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(true); }
      else if (e.key === '/' && !/input|textarea|select/i.test(e.target.tagName)) { e.preventDefault(); setCmdOpen(true); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f5f9]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onOpenCommand={() => setCmdOpen(true)} />
        <main className="flex-1 overflow-y-auto scroll-thin">
          <div className="mx-auto max-w-[1400px] px-5 py-6">
            <BreadcrumbProvider>
              <Breadcrumbs />
              <Outlet />
            </BreadcrumbProvider>
          </div>
        </main>
      </div>
      <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
