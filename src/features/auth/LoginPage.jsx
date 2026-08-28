import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Landmark, Lock, User, ShieldCheck, TrendingUp, Globe2, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { Button, Field, Input } from '../../components/ui/index.js';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('dberks');
  const [password, setPassword] = useState('password123');
  const [otp, setOtp] = useState('');
  const [mfaStep, setMfaStep] = useState(false); // second factor prompt
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) return <Navigate to="/" replace />;

  const from = location.state?.from?.pathname || '/';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password, mfaStep ? otp.trim() : undefined);
      navigate(from, { replace: true });
    } catch (err) {
      // Password OK but a second factor is required — advance to the code step.
      if (err?.status === 401 && err?.body?.mfa_required) {
        setMfaStep(true);
        setError('');
      } else {
        setError(err?.message || 'Sign in failed. Check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const backToPassword = () => { setMfaStep(false); setOtp(''); setError(''); };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-navy-900">
        <div className="absolute inset-0 opacity-90 bg-gradient-to-br from-navy-950 via-navy-900 to-brand-900" />
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -left-16 bottom-10 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-teal-500 shadow-lg">
            <Landmark size={22} />
          </span>
          <div>
            <div className="text-lg font-semibold tracking-tight">AfriCore</div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Core Banking · AfricodeLab</div>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Run the bank<br />from a single console.
          </h1>
          <p className="mt-4 text-slate-300 max-w-md">
            Customer information, accounts, teller operations, lending, payments and compliance — unified, real-time, and audit-ready.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { icon: ShieldCheck, label: 'Audit-ready', sub: 'Every action logged' },
              { icon: TrendingUp, label: 'Real-time', sub: 'Live ledger' },
              { icon: Globe2, label: 'Multi-currency', sub: 'FX built in' },
            ].map((f) => (
              <div key={f.label} className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3">
                <f.icon size={18} className="text-brand-300" />
                <div className="mt-2 text-sm font-medium">{f.label}</div>
                <div className="text-[11px] text-slate-400">{f.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-slate-500">© {new Date().getFullYear()} AfricodeLab · AfriCore Core Banking</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-teal-500 text-white"><Landmark size={20} /></span>
            <span className="text-lg font-semibold text-slate-800">AfriCore</span>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{mfaStep ? 'Two-factor authentication' : 'Sign in'}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {mfaStep ? 'Enter the 6-digit code from your authenticator app, or a recovery code.' : 'Use your banking staff credentials to continue.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {error && (
              <div className="flex items-start gap-2 text-sm text-danger-700 bg-danger-50 border border-danger-500/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            {!mfaStep ? (
              <>
                <Field label="User ID" htmlFor="username">
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. dberks" className="pl-9" autoFocus />
                  </div>
                </Field>

                <Field label="Password" htmlFor="password">
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" />
                  </div>
                </Field>

                <Button type="submit" size="lg" loading={loading} className="w-full">Sign in</Button>
              </>
            ) : (
              <>
                <Field label="Authentication code" htmlFor="otp">
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123 456" className="pl-9 num tracking-widest" autoFocus inputMode="numeric" autoComplete="one-time-code" />
                  </div>
                </Field>
                <Button type="submit" size="lg" loading={loading} className="w-full">Verify & sign in</Button>
                <button type="button" onClick={backToPassword} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mx-auto">
                  <ArrowLeft size={13} /> Back
                </button>
              </>
            )}
          </form>

          {!mfaStep && (
            <div className="mt-6 rounded-md bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Demo access</span> — seeded admin <span className="num">dberks / password123</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
