import React, { useState } from 'react';
import { ShieldCheck, ShieldOff, KeyRound, Copy, Check, Smartphone, AlertTriangle } from 'lucide-react';
import { AuthApi } from '../../lib/api/index.js';
import { useAuth } from '../../lib/auth/AuthContext.jsx';
import { PageHeader, Card, CardHeader, Button, Field, Input, Badge, useToast, useConfirm } from '../../components/ui/index.js';
import { cn } from '../../lib/cn.js';

export function SecuritySettingsPage() {
  const { user, refreshSession } = useAuth();
  const [enabled, setEnabled] = useState(!!user?.mfa_enabled);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Security" description="Protect your account with an extra layer of sign-in security" />

      <Card>
        <CardHeader title="Two-factor authentication" icon={ShieldCheck} subtitle="Time-based one-time passwords (TOTP)" />
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0', enabled ? 'bg-success-50 text-success-600' : 'bg-slate-100 text-slate-400')}>
                <Smartphone size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  Authenticator app {enabled ? <Badge tone="success">on</Badge> : <Badge tone="neutral">off</Badge>}
                </div>
                <p className="text-sm text-slate-500 mt-0.5 max-w-md">
                  {enabled
                    ? 'A code from your authenticator app is required each time you sign in.'
                    : 'Add a second step at sign-in using an app like Google Authenticator, 1Password or Authy.'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            {enabled
              ? <DisableFlow onDone={() => { setEnabled(false); refreshSession?.(); }} />
              : <EnableFlow onDone={() => { setEnabled(true); refreshSession?.(); }} />}
          </div>
        </div>
      </Card>
    </div>
  );
}

function EnableFlow({ onDone }) {
  const toast = useToast();
  const [step, setStep] = useState('idle'); // idle -> scan -> codes
  const [setup, setSetup] = useState(null); // { secret, otpauth_uri }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(null);

  const begin = async () => {
    setBusy(true);
    try {
      const res = await AuthApi.mfaSetup();
      setSetup(res);
      setStep('scan');
    } catch (err) { toast.error(err?.message || 'Could not start setup'); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    if (code.trim().length !== 6) return toast.error('Enter the 6-digit code');
    setBusy(true);
    try {
      const res = await AuthApi.mfaEnable(code.trim());
      setRecovery(res.recovery_codes || []);
      setStep('codes');
      toast.success('Two-factor authentication enabled');
    } catch (err) { toast.error(err?.message || 'Could not enable'); }
    finally { setBusy(false); }
  };

  if (step === 'idle') {
    return <Button icon={ShieldCheck} loading={busy} onClick={begin}>Enable two-factor</Button>;
  }

  if (step === 'codes') {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-warning-700 bg-warning-50 border border-warning-500/20 rounded-md px-3 py-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          Save these recovery codes now. Each can be used once to sign in if you lose your authenticator. They won't be shown again.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(recovery || []).map((c) => <code key={c} className="num text-sm bg-slate-900 text-slate-100 rounded px-3 py-1.5 text-center tracking-wider">{c}</code>)}
        </div>
        <div className="flex gap-2">
          <CopyButton text={(recovery || []).join('\n')} label="Copy codes" />
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }

  // step === 'scan'
  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-slate-700 mb-1">1. Add this key to your authenticator app</div>
        <p className="text-xs text-slate-500 mb-2">Enter the setup key manually, or paste the setup URI into an app that accepts it.</p>
        <div className="flex items-center gap-2">
          <code className="num text-sm bg-slate-100 rounded px-3 py-2 flex-1 tracking-wider break-all">{formatSecret(setup.secret)}</code>
          <CopyButton text={setup.secret} label="Copy key" />
        </div>
        <details className="mt-2">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Show setup URI</summary>
          <code className="num text-2xs text-slate-500 break-all block mt-1">{setup.otpauth_uri}</code>
        </details>
      </div>
      <div>
        <div className="text-sm font-medium text-slate-700 mb-2">2. Enter the 6-digit code from the app</div>
        <div className="flex items-end gap-2">
          <Field label="Verification code" className="w-44">
            <div className="relative">
              <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123 456" className="pl-9 num tracking-widest" inputMode="numeric" autoFocus />
            </div>
          </Field>
          <Button icon={ShieldCheck} loading={busy} onClick={confirm}>Verify & enable</Button>
        </div>
      </div>
    </div>
  );
}

function DisableFlow({ onDone }) {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const disable = async () => {
    if (!code.trim()) return toast.error('Enter a current code to confirm');
    const ok = await confirmDialog({
      title: 'Turn off two-factor authentication?',
      message: 'Your account will be protected by password only. We recommend keeping two-factor on.',
      confirmLabel: 'Turn off',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await AuthApi.mfaDisable(code.trim());
      toast.success('Two-factor authentication disabled');
      onDone?.();
    } catch (err) { toast.error(err?.message || 'Could not disable'); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex items-end gap-2">
      <Field label="Current code (or recovery code)" className="w-64" hint="From your authenticator app.">
        <div className="relative">
          <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123 456" className="pl-9 num tracking-widest" inputMode="numeric" />
        </div>
      </Field>
      <Button variant="danger" icon={ShieldOff} loading={busy} onClick={disable}>Turn off</Button>
    </div>
  );
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { try { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  return <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : label}</Button>;
}

// Group the base32 secret into 4-char blocks for easier manual entry.
function formatSecret(s) {
  return String(s || '').replace(/(.{4})/g, '$1 ').trim();
}
