import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, IdCard, MapPin, Briefcase, Users, ShieldCheck } from 'lucide-react';
import { CustomerApi, BranchApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { PageHeader, Card, CardHeader, CardBody, Field, Input, Textarea, Select, Button, useToast } from '../../components/ui/index.js';
import { asList } from '../accounts/accountsData.js';

const EMPTY = {
  title: '', first_name: '', middle_name: '', last_name: '', dob: '', gender: '',
  marital_status: '', nationality: 'Ghanaian', place_of_birth: '', customer_type: 'individual',
  id_type: 'national_id', id_number: '', id_expiry: '', tin: '',
  email: '', phone: '', alt_phone: '', address: '', city: '', region: '', country: 'Ghana', digital_address: '',
  occupation: '', employer: '', employment_status: '', monthly_income: '', source_of_funds: '',
  next_of_kin_name: '', next_of_kin_relation: '', next_of_kin_phone: '',
  kyc_status: 'pending', risk_rating: 'low', branch_id: '',
};

export function CustomerCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const branches = useAsync(() => BranchApi.list().then(asList), []);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim()) e.last_name = 'Required';
    if (!form.dob) e.dob = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.id_number.trim()) e.id_number = 'Recommended for KYC';
    setErrors(e);
    // id_number is a soft warning — don't block submit on it
    return !e.first_name && !e.last_name && !e.dob && !e.email;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) { toast.error('Please complete the required fields'); return; }
    setSaving(true);
    try {
      const name = [form.first_name, form.middle_name, form.last_name].map((s) => s.trim()).filter(Boolean).join(' ');
      const payload = {
        ...form,
        name,
        monthly_income: parseFloat(form.monthly_income) || 0,
      };
      const created = await CustomerApi.create(payload);
      toast.success('Customer onboarded', { title: created.name });
      navigate(`/customers/${created.customer_id}`);
    } catch (err) {
      toast.error(err?.message || 'Could not create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <button onClick={() => navigate('/customers')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={15} /> Back to customers
      </button>
      <PageHeader title="Onboard customer" description="Create a Customer Information File (CIF) with full KYC details" />

      <form onSubmit={submit} className="space-y-4">
        {/* Identity */}
        <Card>
          <CardHeader title="Personal identity" icon={UserPlus} />
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Title">
              <Select value={form.title} onChange={set('title')}>
                <option value="">—</option>{['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="First name" required error={errors.first_name}>
              <Input value={form.first_name} onChange={set('first_name')} invalid={!!errors.first_name} placeholder="Efua" />
            </Field>
            <Field label="Last name" required error={errors.last_name}>
              <Input value={form.last_name} onChange={set('last_name')} invalid={!!errors.last_name} placeholder="Owusu" />
            </Field>
            <Field label="Middle name">
              <Input value={form.middle_name} onChange={set('middle_name')} />
            </Field>
            <Field label="Date of birth" required error={errors.dob}>
              <Input type="date" value={form.dob} onChange={set('dob')} invalid={!!errors.dob} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={set('gender')}>
                <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Marital status">
              <Select value={form.marital_status} onChange={set('marital_status')}>
                <option value="">—</option>{['single', 'married', 'divorced', 'widowed'].map((s) => <option key={s} value={s} className="capitalize">{s[0].toUpperCase() + s.slice(1)}</option>)}
              </Select>
            </Field>
            <Field label="Nationality">
              <Input value={form.nationality} onChange={set('nationality')} />
            </Field>
            <Field label="Place of birth">
              <Input value={form.place_of_birth} onChange={set('place_of_birth')} />
            </Field>
          </CardBody>
        </Card>

        {/* Identification */}
        <Card>
          <CardHeader title="Identification (KYC)" icon={IdCard} />
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Customer type">
              <Select value={form.customer_type} onChange={set('customer_type')}>
                <option value="individual">Individual</option><option value="corporate">Corporate</option>
              </Select>
            </Field>
            <Field label="ID type">
              <Select value={form.id_type} onChange={set('id_type')}>
                <option value="national_id">National ID (Ghana Card)</option>
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's license</option>
                <option value="voter_id">Voter ID</option>
              </Select>
            </Field>
            <Field label="ID number" error={errors.id_number} hint={!errors.id_number ? 'As shown on the document' : undefined}>
              <Input value={form.id_number} onChange={set('id_number')} mono placeholder="GHA-000000000-0" />
            </Field>
            <Field label="ID expiry">
              <Input type="date" value={form.id_expiry} onChange={set('id_expiry')} />
            </Field>
            <Field label="Tax ID (TIN)">
              <Input value={form.tin} onChange={set('tin')} mono />
            </Field>
          </CardBody>
        </Card>

        {/* Contact & address */}
        <Card>
          <CardHeader title="Contact & address" icon={MapPin} />
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Email" required error={errors.email}>
              <Input type="email" value={form.email} onChange={set('email')} invalid={!!errors.email} placeholder="name@example.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={set('phone')} mono placeholder="+233…" />
            </Field>
            <Field label="Alternate phone">
              <Input value={form.alt_phone} onChange={set('alt_phone')} mono />
            </Field>
            <Field label="Residential address" className="lg:col-span-2">
              <Textarea rows={2} value={form.address} onChange={set('address')} placeholder="Street, house number" />
            </Field>
            <Field label="Digital address (GPS)">
              <Input value={form.digital_address} onChange={set('digital_address')} mono placeholder="GA-123-4567" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={set('city')} />
            </Field>
            <Field label="Region / State">
              <Input value={form.region} onChange={set('region')} />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={set('country')} />
            </Field>
          </CardBody>
        </Card>

        {/* Employment & financial */}
        <Card>
          <CardHeader title="Employment & financial" icon={Briefcase} />
          <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Employment status">
              <Select value={form.employment_status} onChange={set('employment_status')}>
                <option value="">—</option>{['employed', 'self_employed', 'unemployed', 'student', 'retired'].map((s) => <option key={s} value={s}>{s.replace('_', '-').replace(/^\w/, (c) => c.toUpperCase())}</option>)}
              </Select>
            </Field>
            <Field label="Occupation">
              <Input value={form.occupation} onChange={set('occupation')} />
            </Field>
            <Field label="Employer">
              <Input value={form.employer} onChange={set('employer')} />
            </Field>
            <Field label="Monthly income">
              <Input value={form.monthly_income} onChange={(e) => setForm((f) => ({ ...f, monthly_income: e.target.value.replace(/[^0-9.]/g, '') }))} mono inputMode="decimal" placeholder="0.00" />
            </Field>
            <Field label="Source of funds">
              <Select value={form.source_of_funds} onChange={set('source_of_funds')}>
                <option value="">—</option>{['salary', 'business', 'investment', 'remittance', 'inheritance', 'other'].map((s) => <option key={s} value={s} className="capitalize">{s[0].toUpperCase() + s.slice(1)}</option>)}
              </Select>
            </Field>
          </CardBody>
        </Card>

        {/* Next of kin */}
        <Card>
          <CardHeader title="Next of kin" icon={Users} />
          <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Full name">
              <Input value={form.next_of_kin_name} onChange={set('next_of_kin_name')} />
            </Field>
            <Field label="Relationship">
              <Input value={form.next_of_kin_relation} onChange={set('next_of_kin_relation')} placeholder="e.g. spouse, sibling" />
            </Field>
            <Field label="Phone">
              <Input value={form.next_of_kin_phone} onChange={set('next_of_kin_phone')} mono />
            </Field>
          </CardBody>
        </Card>

        {/* Relationship / KYC */}
        <Card>
          <CardHeader title="Relationship & risk" icon={ShieldCheck} />
          <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="KYC status">
              <Select value={form.kyc_status} onChange={set('kyc_status')}>
                <option value="pending">Pending</option><option value="verified">Verified</option><option value="review">Under review</option>
              </Select>
            </Field>
            <Field label="Risk rating">
              <Select value={form.risk_rating} onChange={set('risk_rating')}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </Select>
            </Field>
            <Field label="Home branch" hint={branches.loading ? 'Loading…' : undefined}>
              <Select value={form.branch_id} onChange={set('branch_id')}>
                <option value="">—</option>{(branches.data || []).map((b) => <option key={b.branch_id} value={b.branch_id}>{b.location}</option>)}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/customers')}>Cancel</Button>
          <Button type="submit" icon={UserPlus} loading={saving}>Create customer</Button>
        </div>
      </form>
    </div>
  );
}
