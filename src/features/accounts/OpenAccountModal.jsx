import React, { useState } from 'react';
import { AccountApi, CustomerApi, BranchApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { Modal, Field, Select, Button, useToast } from '../../components/ui/index.js';
import { asList } from './accountsData.js';

export function OpenAccountModal({ open, onClose, onCreated, presetCustomerId }) {
  const toast = useToast();
  const customers = useAsync(() => CustomerApi.list({ limit: 500 }), [], { immediate: open });
  const branches = useAsync(() => BranchApi.list(), [], { immediate: open });

  const [form, setForm] = useState({
    customer_id: presetCustomerId || '',
    account_type: 'savings',
    currency: 'USD',
    branch_id: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const custList = asList(customers.data);
  const branchList = asList(branches.data);

  const submit = async () => {
    if (!form.customer_id) return toast.error('Select a customer');
    if (!form.branch_id) return toast.error('Select a branch');
    setSaving(true);
    try {
      const acct = await AccountApi.create(form);
      toast.success('Account opened', { title: `${form.account_type} · ${form.currency}` });
      onCreated?.(acct);
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Could not open account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Open CASA account"
      subtitle="Create a current or savings account for a customer"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Open account</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Customer" required>
          <Select value={form.customer_id} onChange={set('customer_id')} disabled={!!presetCustomerId}>
            <option value="">Select customer…</option>
            {custList.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.name} — {c.email}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Account type" required>
            <Select value={form.account_type} onChange={set('account_type')}>
              <option value="savings">Savings</option>
              <option value="current">Current</option>
              <option value="checking">Checking</option>
              <option value="fixed">Fixed deposit</option>
            </Select>
          </Field>
          <Field label="Currency" required>
            <Select value={form.currency} onChange={set('currency')}>
              {['USD', 'GHS', 'EUR', 'GBP', 'NGN'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Branch" required hint={branches.loading ? 'Loading branches…' : undefined}>
          <Select value={form.branch_id} onChange={set('branch_id')}>
            <option value="">Select branch…</option>
            {branchList.map((b) => <option key={b.branch_id} value={b.branch_id}>{b.location}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
