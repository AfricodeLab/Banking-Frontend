/**
 * Build an account statement with running balances.
 * Signed amount is +credit when the account is the destination, −debit when it's the source.
 * The opening balance is inferred from the current balance minus the sum of all movements,
 * so running balances reconcile to the live account balance.
 */
export function buildStatement(account, txns, fromDate, toDate) {
  const accId = account.account_id;
  const signed = (t) => (t.to_account_id === accId ? parseFloat(t.amount || 0) : -(parseFloat(t.amount || 0)));

  const sorted = [...txns].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
  const totalChange = sorted.reduce((s, t) => s + signed(t), 0);
  const openingAll = parseFloat(account.balance || 0) - totalChange;

  let running = openingAll;
  const withBal = sorted.map((t) => {
    const s = signed(t);
    running += s;
    return { ...t, signed: s, balance: running };
  });

  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate + 'T23:59:59') : null;
  const inRange = withBal.filter((t) => (!from || new Date(t.transaction_date) >= from) && (!to || new Date(t.transaction_date) <= to));

  if (inRange.length === 0) {
    const before = withBal.filter((t) => !from || new Date(t.transaction_date) < from);
    const opening = before.length ? before[before.length - 1].balance : openingAll;
    return { opening, closing: opening, credits: 0, debits: 0, count: 0, lines: [] };
  }

  const opening = inRange[0].balance - inRange[0].signed;
  const closing = inRange[inRange.length - 1].balance;
  const credits = inRange.filter((t) => t.signed > 0).reduce((s, t) => s + t.signed, 0);
  const debits = inRange.filter((t) => t.signed < 0).reduce((s, t) => s - t.signed, 0);

  return { opening, closing, credits, debits, count: inRange.length, lines: inRange };
}
