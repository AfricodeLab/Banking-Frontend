import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { Card, CardHeader, Button } from '../../components/ui/index.js';
import { ShieldCheck } from 'lucide-react';
import { EnableFlow } from './SecuritySettingsPage.jsx';

// Full-screen gate shown when an account is required to use MFA but hasn't enrolled.
// The only way out (besides enrolling) is to sign out.
export function ForcedMFAGate() {
  const { logout, refreshSession } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-navy-900 text-white flex items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-teal-500 shadow-sm"><Landmark size={19} /></span>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">AfriCore</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Secure sign-in</div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white">
          <LogOut size={16} /> Sign out
        </button>
      </header>

      <main className="flex-1 flex items-start justify-center px-5 py-10">
        <div className="w-full max-w-lg">
          <div className="flex items-start gap-2.5 mb-4 text-sm text-warning-800 bg-warning-50 border border-warning-500/30 rounded-lg px-4 py-3">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warning-600" />
            <div>
              <span className="font-medium">Two-factor authentication is required for your account.</span> Set it up now to continue — it only takes a minute.
            </div>
          </div>
          <Card>
            <CardHeader title="Set up two-factor authentication" icon={ShieldCheck} subtitle="Use an authenticator app" />
            <div className="p-4">
              <EnableFlow onDone={() => refreshSession?.()} />
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
