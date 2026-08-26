import { CustomerApi, LoanApi, TransactionApi, SystemApi } from '../../lib/api/index.js';
import { loadAllAccounts, asList } from '../accounts/accountsData.js';

/** Aggregate everything the command center needs, from live endpoints, in parallel. */
export async function loadDashboard() {
  const [customers, accounts, loans, health] = await Promise.all([
    CustomerApi.list({ limit: 500 }).then(asList).catch(() => []),
    loadAllAccounts().catch(() => []),
    LoanApi.list().then(asList).catch(() => []),
    SystemApi.health().catch(() => ({ status: 'down' })),
  ]);

  // Recent activity: merge each account's transactions (reliable per-account endpoint),
  // dedupe (transfers appear on both legs), enrich with the customer name, newest first.
  const perAccount = await Promise.all(
    accounts.map((a) =>
      TransactionApi.byAccount(a.account_id)
        .then(asList)
        .then((ts) => ts.map((t) => ({ ...t, party: a.customer_name })))
        .catch(() => []),
    ),
  );
  const seen = new Set();
  const txns = perAccount
    .flat()
    .filter((t) => (seen.has(t.transaction_id) ? false : seen.add(t.transaction_id)))
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
    .slice(0, 8);

  return { customers, accounts, loans, txns, health };
}
