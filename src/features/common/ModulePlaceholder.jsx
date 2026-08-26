import React from 'react';
import { Check, Hammer } from 'lucide-react';
import { PageHeader, Card, Badge } from '../../components/ui/index.js';

/**
 * Intentional scaffold for modules that are mapped but not yet built in depth.
 * Shows the module's planned capabilities so the console reads as a complete product roadmap.
 */
export function ModulePlaceholder({ icon: Icon, title, description, capabilities = [], phase = 'Next phase' }) {
  return (
    <div>
      <PageHeader title={title} description={description}
        actions={<Badge tone="warning"><Hammer size={12} /> {phase}</Badge>} />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-brand-50 text-brand-600">
                {Icon && <Icon size={22} />}
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Planned capabilities</h3>
                <p className="text-xs text-slate-400">Wired to the live core-banking API</p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {capabilities.map((cap) => (
                <li key={cap} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-success-50 text-success-600 shrink-0 mt-0.5"><Check size={13} /></span>
                  {cap}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative hidden lg:block bg-navy-900 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-brand-900 opacity-90" />
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-brand-500/20 blur-3xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              {Icon && <Icon size={120} className="text-white/10" strokeWidth={1} />}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
