import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const TONES = {
  success: 'border-success-500/30 text-success-700',
  error: 'border-danger-500/30 text-danger-700',
  warning: 'border-warning-500/30 text-warning-700',
  info: 'border-info-500/30 text-info-600',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((type, message, opts = {}) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, type, message, title: opts.title }]);
    setTimeout(() => dismiss(id), opts.duration ?? 4200);
  }, [dismiss]);

  const toast = {
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    warning: (m, o) => push('warning', m, o),
    info: (m, o) => push('info', m, o),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2.5rem)]">
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <div key={t.id} className={cn('flex items-start gap-3 bg-white border-l-2 rounded-lg shadow-pop px-3.5 py-3 animate-slide-up', TONES[t.type])}>
                <Icon size={18} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  {t.title && <p className="text-sm font-semibold text-slate-800">{t.title}</p>}
                  <p className="text-sm text-slate-600 break-words">{t.message}</p>
                </div>
                <button onClick={() => dismiss(t.id)} className="text-slate-300 hover:text-slate-500"><X size={15} /></button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
