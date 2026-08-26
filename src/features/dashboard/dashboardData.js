import { CustomerApi, LoanApi, TransactionApi, SystemApi, CardApi, StandingOrderApi, ReportApi } from '../../lib/api/index.js';
import { loadAllAccounts, asList } from '../accounts/accountsData.js';

const iso = (d) => d.toISOString().slice(0, 10);

/** Aggregate everything the command center needs, from live endpoints, in parallel. */
export async function loadDashboard() {
  const now = new Date();
  const from = iso(new Date(now.getTime() - 13 * 86400000));
  const to = iso(now);

  const [customers, accounts, loans, health, txStats, cardStats, standingOrders, daily] = await Promise.all([
    CustomerApi.list({ limit: 500 }).then(asList).catch(() => []),
    loadAllAccounts().catch(() => []),
    LoanApi.list().then(asList).catch(() => []),
    SystemApi.health().catch(() => ({ status: 'down' })),
    TransactionApi.stats().catch(() => null),
    CardApi.stats().catch(() => null),
    StandingOrderApi.list().then(asList).catch(() => []),
    ReportApi.dailySummary({ start_date: from, end_date: to }).then((r) => (Array.isArray(r) ? r : r?.data || [])).catch(() => []),
  ]);

  // Recent activity: merge each account's transactions, dedupe, enrich with the customer name, newest first.
  const perAccount = await Promise.all(
    accounts.map((a) =>
      TransactionApi.byAccount(a.account_id, { limit: 10 })
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

  return { customers, accounts, loans, health, txStats, cardStats, standingOrders, daily, txns };
}
