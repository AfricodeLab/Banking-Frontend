import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { CustomerApi } from '../../lib/api/index.js';
import { PageHeader, Card, CardHeader, CardBody, Field, Input, Textarea, Select, Button, useToast } from '../../components/ui/index.js';

const EMPTY = { name: '', dob: '', email: '', phone: '', address: '', kyc_status: 'pending' };

export function CustomerCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.dob) e.dob = 'Date of birth is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const created = await CustomerApi.create({
        name: form.name.trim(),
        dob: form.dob,
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      toast.success('Customer onboarded successfully', { title: created.name });
      navigate(`/customers/${created.customer_id}`);
    } catch (err) {
      toast.error(err?.message || 'Could not create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate('/customers')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={15} /> Back to customers
      </button>

      <PageHeader title="Onboard customer" description="Create a new Customer Information File (CIF)" />

      <form onSubmit={submit}>
        <Card>
          <CardHeader title="Personal details" icon={UserPlus} />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" htmlFor="name" required error={errors.name} className="sm:col-span-2">
                <Input id="name" value={form.name} onChange={set('name')} placeholder="e.g. Ama Mensah" invalid={!!errors.name} />
              </Field>
              <Field label="Date of birth" htmlFor="dob" required error={errors.dob}>
                <Input id="dob" type="date" value={form.dob} onChange={set('dob')} invalid={!!errors.dob} />
              </Field>
              <Field label="KYC status" htmlFor="kyc">
                <Select id="kyc" value={form.kyc_status} onChange={set('kyc_status')}>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="review">Under review</option>
                </Select>
              </Field>
              <Field label="Email" htmlFor="email" required error={errors.email}>
                <Input id="email" type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" invalid={!!errors.email} />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input id="phone" value={form.phone} onChange={set('phone')} placeholder="+233…" mono />
              </Field>
              <Field label="Residential address" htmlFor="address" className="sm:col-span-2">
                <Textarea id="address" value={form.address} onChange={set('address')} placeholder="Street, city, region" />
              </Field>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/customers')}>Cancel</Button>
          <Button type="submit" icon={UserPlus} loading={saving}>Create customer</Button>
        </div>
      </form>
    </div>
  );
}
