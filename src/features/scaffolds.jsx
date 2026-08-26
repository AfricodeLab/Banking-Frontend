import React from 'react';
import {
  Wallet, Banknote, ArrowLeftRight, Receipt, Repeat, Landmark, PiggyBank,
  ShieldCheck, Building2, UserCog, ScrollText, BarChart3, CreditCard, Compass,
} from 'lucide-react';
import { ModulePlaceholder } from './common/ModulePlaceholder.jsx';
import { PageHeader, Card } from '../components/ui/index.js';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/index.js';

export const AccountsPage = () => (
  <ModulePlaceholder icon={Wallet} title="CASA Accounts" description="Current & savings account servicing"
    capabilities={[
      'Open current / savings accounts against a CIF and branch',
      'Account 360: balances, holds, statements and linked cards',
      'Freeze, dormant and closure lifecycle with maker–checker',
      'Standing instructions and sweep configuration',
    ]} />
);

export const TellerPage = () => (
  <ModulePlaceholder icon={Banknote} title="Teller" description="Cash and till operations"
    capabilities={[
      'Cash deposit and withdrawal with denomination capture',
      'Real-time posting to the double-entry ledger',
      'Till open / balance / close and cash position',
      'Receipt printing and transaction reversal',
    ]} />
);

export const PaymentsPage = () => (
  <ModulePlaceholder icon={ArrowLeftRight} title="Payments & Transfers" description="Internal and interbank value movement"
    capabilities={[
      'Own-account and third-party transfers',
      'Beneficiary management and payment templates',
      'Bulk / batch payments and scheduling',
      'FX-aware cross-currency settlement',
    ]} />
);

export const TransactionsPage = () => (
  <ModulePlaceholder icon={Receipt} title="Transactions" description="Enterprise transaction register"
    capabilities={[
      'Unified transaction search across accounts and channels',
      'Drill-down to ledger entries and audit logs',
      'Status lifecycle: pending → processed → reversed',
      'Export and reconciliation views',
    ]} />
);

export const FxPage = () => (
  <ModulePlaceholder icon={Repeat} title="Foreign Exchange" description="Rates and currency conversion"
    capabilities={[
      'Live and historical exchange rates',
      'Currency conversion calculator',
      'Rate cards per corridor and margin control',
      'FX deal capture and revaluation',
    ]} />
);

export const LoansPage = () => (
  <ModulePlaceholder icon={Landmark} title="Loans" description="Origination and servicing"
    capabilities={[
      'Loan application, scoring and approval workflow',
      'Disbursement and repayment schedule generation',
      'Interest accrual, penalties and restructuring',
      'Collateral and guarantor management',
    ]} />
);

export const DepositsPage = () => (
  <ModulePlaceholder icon={PiggyBank} title="Term Deposits" description="Fixed and recurring deposits"
    capabilities={[
      'Book term deposits with tenor and rate',
      'Maturity, rollover and premature closure',
      'Interest computation and payout scheduling',
      'Certificate generation',
    ]} />
);

export const CardsPage = () => (
  <ModulePlaceholder icon={CreditCard} title="Cards" description="Debit and credit card management"
    capabilities={[
      'Issue cards against accounts with limits',
      'Block / unblock, PIN and lifecycle control',
      'Daily and monthly limit configuration',
      'Card transaction monitoring',
    ]} />
);

export const CompliancePage = () => (
  <ModulePlaceholder icon={ShieldCheck} title="KYC / AML" description="Risk and regulatory compliance"
    capabilities={[
      'KYC queue with document verification',
      'AML screening, PEP and sanctions checks',
      'Customer risk scoring and rating',
      'SAR / CTR regulatory reporting',
    ]} />
);

export const BranchesPage = () => (
  <ModulePlaceholder icon={Building2} title="Branches" description="Branch network administration"
    capabilities={[
      'Branch directory with operating hours and contacts',
      'Per-branch accounts, staff and performance',
      'Branch-level limits and cash positions',
    ]} />
);

export const UsersPage = () => (
  <ModulePlaceholder icon={UserCog} title="Users & Roles" description="Access control (RBAC)"
    capabilities={[
      'Staff user directory and provisioning',
      'Roles and granular permission assignment',
      'Maker–checker and segregation of duties',
      'Session and access policy management',
    ]} />
);

export const AuditPage = () => (
  <ModulePlaceholder icon={ScrollText} title="Audit Trail" description="Immutable activity log"
    capabilities={[
      'Every action captured with actor and timestamp',
      'Filter by user, module, entity and date',
      'Tamper-evident, export for regulators',
    ]} />
);

export const ReportsPage = () => (
  <ModulePlaceholder icon={BarChart3} title="Reports" description="Operational and regulatory reporting"
    capabilities={[
      'Transaction, customer and account reports',
      'Daily summary and end-of-day position',
      'Scheduled and on-demand generation',
      'Export to PDF / CSV',
    ]} />
);

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto text-center py-24">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mb-4"><Compass size={26} /></span>
      <h1 className="text-2xl font-semibold text-slate-800">Screen not found</h1>
      <p className="text-sm text-slate-500 mt-1">The screen you’re looking for doesn’t exist or has moved.</p>
      <Button className="mt-5" onClick={() => navigate('/')}>Back to dashboard</Button>
    </div>
  );
}
