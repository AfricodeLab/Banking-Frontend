import { TransactionApi } from '../../lib/api/index.js';
import { loadAllAccounts, asList } from '../accounts/accountsData.js';

/**
 * Bank-wide transaction register: merge every account's transactions (reliable per-account
 * endpoint), dedupe transfers (two legs), enrich each side with the owning customer's name,
 * newest first.
 */
export async function loadAllTransactions() {
  const accounts = await loadAllAccounts();
  const nameByAcct = Object.fromEntries(accounts.map((a) => [a.account_id, a.customer_name]));
  const ccyByAcct = Object.fromEntries(accounts.map((a) => [a.account_id, a.currency]));

  const per = await Promise.all(
    accounts.map((a) => TransactionApi.byAccount(a.account_id).then(asList).catch(() => [])),
  );
  const seen = new Set();
  return per
    .flat()
    .filter((t) => (seen.has(t.transaction_id) ? false : seen.add(t.transaction_id)))
    .map((t) => ({
      ...t,
      from_name: nameByAcct[t.from_account_id] || null,
      to_name: nameByAcct[t.to_account_id] || null,
      currency: t.currency || ccyByAcct[t.to_account_id] || ccyByAcct[t.from_account_id],
    }))
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
}

/** The counterparty label to show for a transaction. */
export function partyLabel(t) {
  if (t.transaction_type === 'deposit') return t.to_name || '—';
  if (t.transaction_type === 'withdrawal') return t.from_name || '—';
  return `${t.from_name || '—'} → ${t.to_name || '—'}`;
}
