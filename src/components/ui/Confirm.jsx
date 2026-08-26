import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, HelpCircle, ShieldAlert } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';
import { cn } from '../../lib/cn.js';

const ConfirmContext = createContext(null);

const TONE = {
  danger: { icon: AlertTriangle, ring: 'bg-danger-50 text-danger-600', btn: 'danger' },
  warning: { icon: ShieldAlert, ring: 'bg-warning-50 text-warning-600', btn: 'primary' },
  primary: { icon: HelpCircle, ring: 'bg-brand-50 text-brand-600', btn: 'primary' },
};

/**
 * Promise-based confirmation. Usage:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title, message, confirmLabel, tone: 'danger' }))) return;
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, opts: {}, resolve: null });

  const confirm = useCallback((opts = {}) => new Promise((resolve) => {
    setState({ open: true, opts, resolve });
  }), []);

  const settle = (value) => {
    setState((s) => { s.resolve?.(value); return { ...s, open: false, resolve: null }; });
  };

  const { opts } = state;
  const tone = TONE[opts.tone] || TONE.primary;
  const Icon = tone.icon;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={state.open}
        onClose={() => settle(false)}
        title={opts.title || 'Are you sure?'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>{opts.cancelLabel || 'Cancel'}</Button>
            <Button variant={tone.btn} onClick={() => settle(true)}>{opts.confirmLabel || 'Confirm'}</Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className={cn('flex items-center justify-center w-10 h-10 rounded-full shrink-0', tone.ring)}>
            <Icon size={20} />
          </span>
          <div className="text-sm text-slate-600 pt-1">{opts.message || 'This action cannot be undone.'}</div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
