import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthApi } from '../api/index.js';
import { getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);
const USER_KEY = 'nb.user';

function loadUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
function saveUser(u) {
  try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);
  const [token, setTok] = useState(getToken);
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await AuthApi.login(username, password);
      setToken(res.token);
      setTok(res.token);
      setUser(res.user);
      saveUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    saveUser(null);
    setTok(null);
    setUser(null);
  };

  useEffect(() => { saveUser(user); }, [user]);

  const value = useMemo(
    () => ({ user, token, loading, isAuthenticated: !!token, login, logout }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
