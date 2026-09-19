'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Building2, Copy, LockKeyhole, Mail, Power, RefreshCw, Save, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface Company {
  _id: string;
  name: string;
  email: string;
  logo?: string;
  website?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = { name: '', email: '', password: '', logo: '', website: '', description: '' };

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCompanies = async () => {
    setLoading(true);
    const response = await fetch('/api/admin/companies');
    const data = await response.json();
    if (!response.ok) toast.error(data.error || 'Could not load companies');
    else setCompanies(data.companies || []);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCompanies(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const createCompany = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const response = await fetch('/api/admin/companies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) toast.error(data.error || 'Could not create company');
    else { toast.success('Company account created'); setForm(emptyForm); void loadCompanies(); }
    setSaving(false);
  };

  const toggleCompany = async (company: Company) => {
    const response = await fetch(`/api/admin/companies/${company._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !company.isActive }),
    });
    if (!response.ok) toast.error('Could not update company status');
    else setCompanies((items) => items.map((item) => item._id === company._id ? { ...item, isActive: !company.isActive } : item));
  };

  const copyLogin = async (email: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/company/login\n${email}`);
    toast.success('Company login details copied');
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">Access management</p><h1 className="text-3xl font-semibold tracking-tight">Companies</h1><p className="mt-2 text-sm text-muted-foreground">Provision employer accounts and control their access to the assessment portal.</p></div>
          <button onClick={() => void loadCompanies()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </header>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold">Provisioned companies</h2><p className="text-xs text-muted-foreground">Only administrators can create these accounts.</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{companies.length} total</span></div>
            {loading ? <div className="p-10 text-center text-sm text-muted-foreground">Loading companies…</div> : companies.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No company accounts yet.</div> : <div className="divide-y divide-border">{companies.map((company) => <div key={company._id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 text-primary">{company.logo ? <img src={company.logo} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5" />}</div><div className="min-w-0"><p className="truncate font-medium">{company.name}</p><p className="truncate text-xs text-muted-foreground">{company.email}</p></div></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${company.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>{company.isActive ? 'Active' : 'Paused'}</span><button title="Copy login" onClick={() => void copyLogin(company.email)} className="rounded-md border border-border p-2 hover:bg-muted"><Copy className="h-4 w-4" /></button><button title={company.isActive ? 'Pause company' : 'Activate company'} onClick={() => void toggleCompany(company)} className="rounded-md border border-border p-2 hover:bg-muted"><Power className="h-4 w-4" /></button></div></div>)}</div>}
          </section>
          <section className="rounded-xl border border-border bg-card p-5"><div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><UserPlus className="h-5 w-5" /></div><div><h2 className="font-semibold">Create company account</h2><p className="text-xs text-muted-foreground">Credentials are shared securely with the company.</p></div></div><form onSubmit={createCompany} className="space-y-4">{[ ['name','Company name',Building2,'text'], ['email','Login email',Mail,'email'], ['password','Temporary password',LockKeyhole,'password'], ['logo','Logo URL',Building2,'url'], ['website','Website',Building2,'url'] ].map(([key, label, Icon, type]) => <label key={key as string} className="block text-sm"><span className="mb-1.5 block font-medium">{label as string}{(key === 'name' || key === 'email' || key === 'password') && <span className="text-destructive"> *</span>}</span><div className="relative"><Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input required={key === 'name' || key === 'email' || key === 'password'} type={type as string} value={form[key as keyof typeof form]} onChange={(event) => setForm({ ...form, [key as keyof typeof form]: event.target.value })} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" /></div></label>)}<label className="block text-sm"><span className="mb-1.5 block font-medium">Candidate-facing description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary" /></label><button disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Creating…' : 'Create account'}</button></form><p className="mt-4 text-xs leading-5 text-muted-foreground">Company self-registration is intentionally unavailable. All accounts originate here.</p></section>
        </div>
      </div>
    </div>
  );
}
