import { CustomerApi, AccountApi } from '../../lib/api/index.js';

// Normalize any list-ish response: a bare array, or an object wrapping the array
// under keys like data/transactions/accounts/customers/items.
const asList = (r) => {
  if (Array.isArray(r)) return r;
  if (!r || typeof r !== 'object') return [];
  const arr = Object.values(r).find((v) => Array.isArray(v));
  return arr || [];
};

/**
 * The API exposes accounts per-customer, so aggregate across the customer file.
 * Returns accounts enriched with their owning customer's name.
 */
export async function loadAllAccounts() {
  const customers = asList(await CustomerApi.list({ limit: 500 }));
  const perCustomer = await Promise.all(
    customers.map(async (c) => {
      try {
        const accts = asList(await AccountApi.byCustomer(c.customer_id));
        return accts.map((a) => ({ ...a, customer_name: c.name, customer_email: c.email }));
      } catch {
        return [];
      }
    }),
  );
  return perCustomer.flat();
}

export { asList };
