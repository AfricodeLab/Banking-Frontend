/**
 * Thin fetch wrapper for the Go core-banking API.
 * - Injects the bearer token
 * - Normalizes errors into ApiError
 * - Parses JSON responses
 */

// Backend base URL. Override at build/run time with API_BASE_URL; defaults to the
// local core-banking server. (Runs on :8090 — :8080 hosts the legacy instance.)
export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) ||
  'http://localhost:8090';

const TOKEN_KEY = 'nb.token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request(method, path, { body, params, auth = true, signal } = {}) {
  const url = new URL(path.startsWith('http') ? path : API_BASE_URL + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    throw new ApiError(
      `Cannot reach the banking server at ${API_BASE_URL}. Is the backend running?`,
      0,
      { cause: String(err) },
    );
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const msg = (data && data.error) || (typeof data === 'string' && data) || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return data;
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts),
};
