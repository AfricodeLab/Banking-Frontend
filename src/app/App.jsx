import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../lib/auth/AuthContext.jsx';
import { ToastProvider, ConfirmProvider } from '../components/ui/index.js';
import { AppShell } from '../components/layout/AppShell.jsx';
import { RequireAuth } from './RequireAuth.jsx';
import { CustomerPortal } from '../features/portal/CustomerPortal.jsx';
import { ForcedMFAGate } from '../features/settings/ForcedMFAGate.jsx';

import { LoginPage } from '../features/auth/LoginPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { CustomerListPage } from '../features/customers/CustomerListPage.jsx';
import { CustomerCreatePage } from '../features/customers/CustomerCreatePage.jsx';
import { CustomerDetailPage } from '../features/customers/CustomerDetailPage.jsx';
import { AccountsListPage } from '../features/accounts/AccountsListPage.jsx';
import { AccountDetailPage } from '../features/accounts/AccountDetailPage.jsx';
import { StatementPage } from '../features/accounts/StatementPage.jsx';
import { TellerPage } from '../features/teller/TellerPage.jsx';
import { LoansListPage } from '../features/loans/LoansListPage.jsx';
import { LoanCreatePage } from '../features/loans/LoanCreatePage.jsx';
import { LoanDetailPage } from '../features/loans/LoanDetailPage.jsx';
import { DepositsListPage } from '../features/deposits/DepositsListPage.jsx';
import { BookDepositPage } from '../features/deposits/BookDepositPage.jsx';
import { CompliancePage } from '../features/compliance/CompliancePage.jsx';
import { RegulatoryPage } from '../features/regulatory/RegulatoryPage.jsx';
import { ProductsPage } from '../features/products/ProductsPage.jsx';
import { BranchesListPage } from '../features/branches/BranchesListPage.jsx';
import { CardsPage } from '../features/cards/CardsPage.jsx';
import { TransactionsPage } from '../features/transactions/TransactionsPage.jsx';
import { ReportsPage } from '../features/reports/ReportsPage.jsx';
import { PaymentsPage } from '../features/payments/PaymentsPage.jsx';
import { ApprovalsPage } from '../features/approvals/ApprovalsPage.jsx';
import { SecuritySettingsPage } from '../features/settings/SecuritySettingsPage.jsx';
import { RailsPage } from '../features/rails/RailsPage.jsx';
import { CashDrawerPage } from '../features/teller/CashDrawerPage.jsx';
import { RiskAlertsPage } from '../features/risk/RiskAlertsPage.jsx';
import { AuditPage } from '../features/audit/AuditPage.jsx';
import { FxPage } from '../features/fx/FxPage.jsx';
import { UsersRolesPage } from '../features/admin/UsersRolesPage.jsx';
import { DeveloperPage } from '../features/developers/DeveloperPage.jsx';
import { NotFoundPage } from '../features/scaffolds.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

// AppRoutes branches on the kind of login: customer logins (linked to a CIF) get the
// self-service portal; staff get the full console.
function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const isCustomer = isAuthenticated && !!user?.customer_id;
  // Staff whose role/account requires MFA but haven't enrolled are gated until they do.
  const mustEnrolMFA = isAuthenticated && !isCustomer && user?.mfa_required && !user?.mfa_enabled;

  if (mustEnrolMFA) {
    return (
      <Routes>
        <Route path="*" element={<RequireAuth><ForcedMFAGate /></RequireAuth>} />
      </Routes>
    );
  }

  if (isCustomer) {
    return (
      <Routes>
        <Route path="/" element={<RequireAuth><CustomerPortal /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route index element={<DashboardPage />} />
              <Route path="customers" element={<CustomerListPage />} />
              <Route path="customers/new" element={<CustomerCreatePage />} />
              <Route path="customers/:id/edit" element={<CustomerCreatePage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="accounts" element={<AccountsListPage />} />
              <Route path="accounts/:id" element={<AccountDetailPage />} />
              <Route path="accounts/:id/statement" element={<StatementPage />} />
              <Route path="cards" element={<CardsPage />} />
              <Route path="teller" element={<TellerPage />} />
              <Route path="cash-drawer" element={<CashDrawerPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="approvals" element={<ApprovalsPage />} />
              <Route path="rails" element={<RailsPage />} />
              <Route path="fx" element={<FxPage />} />
              <Route path="loans" element={<LoansListPage />} />
              <Route path="loans/new" element={<LoanCreatePage />} />
              <Route path="loans/:id" element={<LoanDetailPage />} />
              <Route path="deposits" element={<DepositsListPage />} />
              <Route path="deposits/new" element={<BookDepositPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="compliance" element={<CompliancePage />} />
              <Route path="regulatory" element={<RegulatoryPage />} />
              <Route path="risk" element={<RiskAlertsPage />} />
              <Route path="branches" element={<BranchesListPage />} />
              <Route path="admin/users" element={<UsersRolesPage />} />
              <Route path="developers" element={<DeveloperPage />} />
              <Route path="settings/security" element={<SecuritySettingsPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
