/**
 * Teller session persistence. The till journal, cash position and current selection are kept
 * in sessionStorage so they survive navigating between screens (and reloads) for the working
 * session, and clear when the app/window closes or the teller ends the session.
 */
const KEY = 'nb.teller.session';

const DEFAULT = { op: 'deposit', from: '', to: '', session: { txns: [], cashIn: 0, cashOut: 0 } };

export function loadTellerSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return s ? { ...DEFAULT, ...s, session: { ...DEFAULT.session, ...(s.session || {}) } } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function saveTellerSession(state) {
  try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function clearTellerSession() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
