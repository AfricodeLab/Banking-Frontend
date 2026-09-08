import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext.jsx';
import { landingPathFor } from '../lib/auth/access.js';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';

// Index ("/") element. The command-centre dashboard shows bank-wide KPIs and is reserved
// for oversight roles (view_dashboard). Front-line roles (teller, CSR, loan, treasury) don't
// see it — they're sent to their primary workspace instead, so nobody lands on a screen
// they're not permitted to open.
export function HomeRedirect() {
  const { can } = useAuth();
  const to = landingPathFor(can);
  if (to) return <Navigate to={to} replace />;
  return <DashboardPage />;
}
