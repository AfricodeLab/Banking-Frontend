import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../lib/auth/AuthContext.jsx';
import { permForPath } from '../lib/auth/access.js';

// Layout guard for the authenticated console. Resolves the permission required by the
// current route and renders the module (Outlet) only if the user holds it; otherwise it
// shows an access-denied panel instead of the module. This backstops the sidebar: hiding
// a menu item is cosmetic, so deep-links / stale URLs are enforced here too. The server
// still authorizes every API call — this is UX, not the security boundary.
export function PermGuard() {
  const { can } = useAuth();
  const { pathname } = useLocation();
  const perm = permForPath(pathname);

  if (perm && !can(perm)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
          <ShieldAlert size={26} />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-slate-800">Access restricted</h1>
        <p className="mt-1.5 max-w-md text-sm text-slate-500">
          Your role doesn’t have permission to open this module. If you believe this is a
          mistake, contact an administrator to review your access.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
