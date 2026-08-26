/** Loan math — mirrors the backend's amortized-payment formula. */

export function monthlyPayment(principal, annualRatePct, months) {
  const p = Number(principal) || 0;
  const n = Number(months) || 0;
  const r = (Number(annualRatePct) || 0) / 100 / 12;
  if (n <= 0) return 0;
  if (r === 0) return p / n;
  const factor = Math.pow(1 + r, n);
  return (p * r * factor) / (factor - 1);
}

export function buildSchedule(principal, annualRatePct, months) {
  const pay = monthlyPayment(principal, annualRatePct, months);
  const r = (Number(annualRatePct) || 0) / 100 / 12;
  let balance = Number(principal) || 0;
  const rows = [];
  for (let i = 1; i <= (Number(months) || 0); i++) {
    const interest = balance * r;
    let principalPart = pay - interest;
    if (principalPart > balance) principalPart = balance;
    balance = Math.max(0, balance - principalPart);
    rows.push({ n: i, payment: pay, interest, principal: principalPart, balance });
  }
  return rows;
}
