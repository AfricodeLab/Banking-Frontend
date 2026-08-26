/**
 * Term-deposit metadata store.
 * The core banking API has no term-deposit service yet, so a TD is modelled as a
 * `fixed`-type CASA account funded by a deposit. The tenor/rate/booking-date that the
 * backend doesn't persist are kept here (keyed by account id) so the TD lifecycle
 * (maturity date & value) can be shown. Swap this for a real TD endpoint later.
 */
const KEY = 'nb.termdeposits';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function writeAll(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

export function saveTD(accountId, meta) {
  const all = readAll();
  all[accountId] = { ...meta, accountId };
  writeAll(all);
}
export function getTD(accountId) {
  return readAll()[accountId] || null;
}
export function allTD() {
  return readAll();
}

/** Simple-interest maturity value + date. */
export function maturity({ principal, rate, tenorMonths, openedAt }) {
  const p = Number(principal) || 0;
  const r = Number(rate) || 0;
  const t = Number(tenorMonths) || 0;
  const interest = p * (r / 100) * (t / 12);
  const value = p + interest;
  let date = null;
  if (openedAt) {
    const d = new Date(openedAt);
    d.setMonth(d.getMonth() + t);
    date = d.toISOString();
  }
  return { interest, value, date };
}
