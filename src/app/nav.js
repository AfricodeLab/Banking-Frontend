import {
  LayoutDashboard, Users, Wallet, Banknote, ArrowLeftRight, Receipt,
  Landmark, PiggyBank, CreditCard, ShieldCheck, Building2, UserCog,
  ScrollText, BarChart3, Repeat,
} from 'lucide-react';

/**
 * FLEXCUBE-style module map. Each group renders a labelled section in the sidebar.
 * `to` is a route path; `end` marks exact-match nav items.
 */
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Customer & Accounts',
    items: [
      { to: '/customers', label: 'Customers (CIF)', icon: Users },
      { to: '/accounts', label: 'CASA Accounts', icon: Wallet },
      { to: '/cards', label: 'Cards', icon: CreditCard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/teller', label: 'Teller', icon: Banknote },
      { to: '/payments', label: 'Payments & Transfers', icon: ArrowLeftRight },
      { to: '/transactions', label: 'Transactions', icon: Receipt },
      { to: '/fx', label: 'Foreign Exchange', icon: Repeat },
    ],
  },
  {
    label: 'Lending & Deposits',
    items: [
      { to: '/loans', label: 'Loans', icon: Landmark },
      { to: '/deposits', label: 'Term Deposits', icon: PiggyBank },
    ],
  },
  {
    label: 'Risk & Compliance',
    items: [
      { to: '/compliance', label: 'KYC / AML', icon: ShieldCheck },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/branches', label: 'Branches', icon: Building2 },
      { to: '/admin/users', label: 'Users & Roles', icon: UserCog },
      { to: '/audit', label: 'Audit Trail', icon: ScrollText },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
];

// Flat list for breadcrumb / title lookups.
export const NAV_INDEX = NAV_GROUPS.flatMap((g) => g.items);
