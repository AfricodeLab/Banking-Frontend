import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, IdCard, MapPin, Briefcase, Users, ShieldCheck, FileText,
  Check, Paperclip, X, ReceiptText,
} from 'lucide-react';
import { CustomerApi, BranchApi } from '../../lib/api/index.js';
import { useAsync } from '../../lib/useAsync.js';
import { PageHeader, Card, CardHeader, CardBody, Field, Input, Textarea, Select, Button, Badge, useToast } from '../../components/ui/index.js';
import { asList } from '../accounts/accountsData.js';
import { initials } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

const EMPTY = {
  title: '', first_name: '', middle_name: '', last_name: '', dob: '', gender: '',
  marital_status: '', nationality: 'Ghanaian', place_of_birth: '', customer_type: 'individual',
  id_type: 'national_id', id_number: '', id_expiry: '', tin: '',
  proof_of_address_type: 'ecg_bill', proof_of_address_ref: '', proof_of_address_date: '',
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
  const [docs, setDocs] = useState({ id: null, poa: null });
  const idFileRef = useRef(null);
  const poaFileRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'Required';
    if (!form.last_name.trim()) e.last_name = 'Required';
    if (!form.dob) e.dob = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    setErrors(e);
    return !e.first_name && !e.last_name && !e.dob && !e.email;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) { toast.error('Please complete the required fields'); return; }
    setSaving(true);
    try {
      const name = [form.first_name, form.middle_name, form.last_name].map((s) => s.trim()).filter(Boolean).join(' ');
      const created = await CustomerApi.create({ ...form, name, monthly_income: parseFloat(form.monthly_income) || 0 });
      toast.success('Customer onboarded', { title: created.name });
      navigate(`/customers/${created.customer_id}`);
    } catch (err) {
      toast.error(err?.message || 'Could not create customer');
    } finally { setSaving(false); }
  };

  const composedName = [form.first_name, form.middle_name, form.last_name].map((s) => s.trim()).filter(Boolean).join(' ');

  // KYC completeness checklist (drives the right rail).
  const checks = useMemo(() => ([
    { key: 'identity', label: 'Personal identity', done: !!(form.first_name && form.last_name && form.dob) },
    { key: 'contact', label: 'Contact & address', done: !!(form.email && form.address && form.city) },
    { key: 'id', label: 'Identification', done: !!(form.id_type && form.id_number) },
    { key: 'poa', label: 'Proof of address', done: !!(form.proof_of_address_type && form.proof_of_address_ref) },
    { key: 'employment', label: 'Employment & income', done: !!(form.employment_status && form.occupation) },
    { key: 'nok', label: 'Next of kin', done: !!(form.next_of_kin_name && form.next_of_kin_phone) },
  ]), [form]);
  const completed = checks.filter((c) => c.done).length;
  const pct = Math.round((completed / checks.length) * 100);

  const onFile = (which) => (e) => {
    const file = e.target.files?.[0];
    if (file) setDocs((d) => ({ ...d, [which]: file.name }));
  };

  return (
    <div>
      <button onClick={() => navigate('/customers')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft size={15} /> Back to customers
      </button>
      <PageHeader title="Onboard customer" description="Create a Customer Information File (CIF) with full KYC details" />

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        {/* LEFT — form sections */}
        <div className="space-y-4 min-w-0">
          <Card>
            <CardHeader title="Personal identity" icon={UserPlus} />
            <CardBody className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="Title">
                <Select value={form.title} onChange={set('title')}>
                  <option value="">—</option>{['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="First name" required error={errors.first_name} className="col-span-2 sm:col-span-1">
                <Input value={form.first_name} onChange={set('first_name')} invalid={!!errors.first_name} placeholder="Efua" />
              </Field>
              <Field label="Middle name">
                <Input value={form.middle_name} onChange={set('middle_name')} />
              </Field>
              <Field label="Last name" required error={errors.last_name}>
                <Input value={form.last_name} onChange={set('last_name')} invalid={!!errors.last_name} placeholder="Owusu" />
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
                  <option value="">—</option>{['single', 'married', 'divorced', 'widowed'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                </Select>
              </Field>
              <Field label="Nationality"><Input value={form.nationality} onChange={set('nationality')} /></Field>
              <Field label="Place of birth"><Input value={form.place_of_birth} onChange={set('place_of_birth')} /></Field>
              <Field label="Customer type">
                <Select value={form.customer_type} onChange={set('customer_type')}>
                  <option value="individual">Individual</option><option value="corporate">Corporate</option>
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Identification (KYC)" icon={IdCard} />
            <CardBody className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="ID type">
                <Select value={form.id_type} onChange={set('id_type')}>
                  <option value="national_id">Ghana Card</option><option value="passport">Passport</option>
                  <option value="drivers_license">Driver's license</option><option value="voter_id">Voter ID</option>
                </Select>
              </Field>
              <Field label="ID number"><Input value={form.id_number} onChange={set('id_number')} mono placeholder="GHA-000000000-0" /></Field>
              <Field label="ID expiry"><Input type="date" value={form.id_expiry} onChange={set('id_expiry')} /></Field>
              <Field label="Tax ID (TIN)"><Input value={form.tin} onChange={set('tin')} mono /></Field>
              <DocRow label="ID document" file={docs.id} onPick={() => idFileRef.current?.click()} onClear={() => setDocs((d) => ({ ...d, id: null }))} />
              <input ref={idFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile('id')} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Proof of address" icon={ReceiptText} subtitle="Utility bill or equivalent — a KYC requirement" />
            <CardBody className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Document type">
                <Select value={form.proof_of_address_type} onChange={set('proof_of_address_type')}>
                  <option value="ecg_bill">ECG electricity bill</option>
                  <option value="water_bill">Ghana Water bill</option>
                  <option value="tenancy">Tenancy agreement</option>
                  <option value="bank_statement">Bank statement</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Bill / account no." hint="e.g. ECG meter or account number">
                <Input value={form.proof_of_address_ref} onChange={set('proof_of_address_ref')} mono placeholder="ECG-00-000000-0" />
              </Field>
              <Field label="Document date"><Input type="date" value={form.proof_of_address_date} onChange={set('proof_of_address_date')} /></Field>
              <DocRow label="Attach bill" file={docs.poa} onPick={() => poaFileRef.current?.click()} onClear={() => setDocs((d) => ({ ...d, poa: null }))} />
              <input ref={poaFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile('poa')} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Contact & address" icon={MapPin} />
            <CardBody className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Email" required error={errors.email}><Input type="email" value={form.email} onChange={set('email')} invalid={!!errors.email} placeholder="name@example.com" /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={set('phone')} mono placeholder="+233…" /></Field>
              <Field label="Alternate phone"><Input value={form.alt_phone} onChange={set('alt_phone')} mono /></Field>
              <Field label="Residential address" className="col-span-2"><Textarea rows={2} value={form.address} onChange={set('address')} placeholder="Street, house number" /></Field>
              <Field label="Digital address (GPS)"><Input value={form.digital_address} onChange={set('digital_address')} mono placeholder="GA-123-4567" /></Field>
              <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
              <Field label="Region / State"><Input value={form.region} onChange={set('region')} /></Field>
              <Field label="Country"><Input value={form.country} onChange={set('country')} /></Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Employment & financial" icon={Briefcase} />
            <CardBody className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Employment status">
                <Select value={form.employment_status} onChange={set('employment_status')}>
                  <option value="">—</option>{['employed', 'self_employed', 'unemployed', 'student', 'retired'].map((s) => <option key={s} value={s}>{s.replace('_', '-').replace(/^\w/, (c) => c.toUpperCase())}</option>)}
                </Select>
              </Field>
              <Field label="Occupation"><Input value={form.occupation} onChange={set('occupation')} /></Field>
              <Field label="Employer"><Input value={form.employer} onChange={set('employer')} /></Field>
              <Field label="Monthly income"><Input value={form.monthly_income} onChange={(e) => setForm((f) => ({ ...f, monthly_income: e.target.value.replace(/[^0-9.]/g, '') }))} mono inputMode="decimal" placeholder="0.00" /></Field>
              <Field label="Source of funds">
                <Select value={form.source_of_funds} onChange={set('source_of_funds')}>
                  <option value="">—</option>{['salary', 'business', 'investment', 'remittance', 'inheritance', 'other'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Next of kin" icon={Users} />
            <CardBody className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Full name"><Input value={form.next_of_kin_name} onChange={set('next_of_kin_name')} /></Field>
              <Field label="Relationship"><Input value={form.next_of_kin_relation} onChange={set('next_of_kin_relation')} placeholder="e.g. spouse, sibling" /></Field>
              <Field label="Phone"><Input value={form.next_of_kin_phone} onChange={set('next_of_kin_phone')} mono /></Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Relationship & risk" icon={ShieldCheck} />
            <CardBody className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

          <div className="flex items-center justify-end gap-2 pb-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/customers')}>Cancel</Button>
            <Button type="submit" icon={UserPlus} loading={saving}>Create customer</Button>
          </div>
        </div>

        {/* RIGHT — sticky live preview + checklist */}
        <aside className="xl:sticky xl:top-2 space-y-4">
          <Card>
            <div className="p-5 flex flex-col items-center text-center border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white rounded-t-lg">
              <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-brand-600 text-white text-xl font-semibold mb-3">
                {composedName ? initials(composedName) : '—'}
              </span>
              <div className="text-base font-semibold text-slate-900">{[form.title, composedName].filter(Boolean).join(' ') || 'New customer'}</div>
              <div className="text-xs text-slate-400 mt-0.5 truncate max-w-full">{form.email || 'email pending'}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <Badge tone="neutral">{form.customer_type}</Badge>
                <Badge tone={form.kyc_status === 'verified' ? 'success' : 'warning'}>{form.kyc_status}</Badge>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-600">KYC completeness</span>
                <span className="num text-slate-500">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <ul className="space-y-1.5">
                {checks.map((c) => (
                  <li key={c.key} className="flex items-center gap-2 text-sm">
                    <span className={cn('flex items-center justify-center w-4 h-4 rounded-full shrink-0', c.done ? 'bg-success-500 text-white' : 'bg-slate-200 text-slate-400')}>
                      {c.done ? <Check size={11} strokeWidth={3} /> : null}
                    </span>
                    <span className={c.done ? 'text-slate-700' : 'text-slate-400'}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          <div className="flex items-start gap-2 text-xs text-slate-400 px-1">
            <FileText size={14} className="mt-0.5 shrink-0" />
            <p>Attached documents are captured at the branch. Required fields are marked with an asterisk.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function DocRow({ label, file, onPick, onClear }) {
  return (
    <div className="col-span-2">
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      {file ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-success-500/30 bg-success-50 text-sm text-success-700">
          <Paperclip size={14} /><span className="truncate flex-1">{file}</span>
          <button type="button" onClick={onClear} className="text-success-600 hover:text-success-700"><X size={14} /></button>
        </div>
      ) : (
        <button type="button" onClick={onPick} className="flex items-center gap-2 h-9 px-3 w-full rounded-md border border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors">
          <Paperclip size={14} /> Attach file
        </button>
      )}
    </div>
  );
}
