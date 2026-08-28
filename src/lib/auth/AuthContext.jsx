import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { AuthApi } from '../api/index.js';
import { getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);
const USER_KEY = 'nb.user';
const PERMS_KEY = 'nb.perms';

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function saveJSON(key, value) {
  try { value ? localStorage.setItem(key, JSON.stringify(value)) : localStorage.removeItem(key); } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadJSON(USER_KEY, null));
  const [permissions, setPermissions] = useState(() => loadJSON(PERMS_KEY, []) || []);
  const [token, setTok] = useState(getToken);
  const [loading, setLoading] = useState(false);

  const applyPerms = useCallback((list) => {
    const arr = Array.isArray(list) ? list : [];
    setPermissions(arr);
    saveJSON(PERMS_KEY, arr);
  }, []);

  const login = async (username, password, otp) => {
    setLoading(true);
    try {
      const res = await AuthApi.login(username, password, otp);
      setToken(res.token);
      setTok(res.token);
      setUser(res.user);
      saveJSON(USER_KEY, res.user);
      applyPerms(res.permissions);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    saveJSON(USER_KEY, null);
    saveJSON(PERMS_KEY, null);
    setTok(null);
    setUser(null);
    setPermissions([]);
    // Clear any per-session state (e.g. the teller till journal) so nothing leaks
    // to the next operator on a shared terminal.
    try { sessionStorage.clear(); } catch { /* ignore */ }
  };

  // Re-validate against the server and refresh permissions + MFA status. Used on mount
  // (after a reload) and after security changes (e.g. enabling/disabling MFA).
  const refreshSession = useCallback(async () => {
    try {
      const res = await AuthApi.validate();
      if (res?.permissions) applyPerms(res.permissions);
      setUser((u) => {
        const next = { ...(u || {}), mfa_enabled: !!res?.mfa_enabled };
        saveJSON(USER_KEY, next);
        return next;
      });
    } catch { /* keep cached state; token errors surface on the next real request */ }
  }, [applyPerms]);

  useEffect(() => {
    if (token) refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = permissions.includes('admin');
  // can() is permissive when we have no permission list at all (older tokens / offline),
  // so the UI never hard-locks a legitimate user; the server still enforces every action.
  const can = useCallback(
    (perm) => {
      if (!perm) return true;
      if (isAdmin) return true;
      if (!permissions.length) return true;
      return permissions.includes(perm);
    },
    [permissions, isAdmin],
  );

  const value = useMemo(
    () => ({ user, token, permissions, loading, isAuthenticated: !!token, isAdmin, can, login, logout, refreshSession }),
    [user, token, permissions, loading, isAdmin, can, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
