// Single source of truth for console authorization: which permission each module
// requires. Keyed by the top-level route segment. Both the sidebar (to hide modules)
// and the route guard (to block deep-links) resolve access through here, so the menu
// and the router can never drift apart. Segments absent from this map are open to any
// authenticated staff user (e.g. the dashboard and personal security settings).
export const MODULE_PERMS = {
  customers: 'read_customer',
  accounts: 'read_account',
  cards: 'read_card',
  teller: 'process_transaction',
  'cash-drawer': 'process_transaction',
  payments: 'create_transaction',
  transactions: 'read_transaction',
  approvals: 'approve_transaction',
  rails: 'admin',
  fx: 'read_fx',
  loans: 'read_loan',
  deposits: 'read_deposit',
  products: 'admin',
  compliance: 'read_compliance',
  regulatory: 'read_compliance',
  risk: 'read_compliance',
  branches: 'manage_branch',
  admin: 'admin', // /admin/* — Users & Roles
  developers: 'admin',
  audit: 'read_audit',
  reports: 'read_report',
};

// Resolve the permission required to view a given path. Returns null when the path is
// open to any authenticated user. Matches on the first path segment (hash-router paths
// arrive without the leading '#', e.g. "/loans/42" or "loans/42").
export function permForPath(pathname) {
  const seg = String(pathname || '').replace(/^\/+/, '').split('/')[0] || '';
  return MODULE_PERMS[seg] || null;
}
