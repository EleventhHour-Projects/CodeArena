'use client';

import { useEffect, useState, FormEvent, useRef, ChangeEvent } from 'react';
import {
  Building2,
  Mail,
  Globe,
  Upload,
  Trash2,
  Save,
  ImageIcon,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface CompanyProfile {
  name: string;
  email: string;
  logo: string;
  website: string;
  description: string;
}

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile>({
    name: '',
    email: '',
    logo: '',
    website: '',
    description: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/company/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.company) setProfile(d.company);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load profile');
        setLoading(false);
      });
  }, []);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);

    // Read directly via FileReader for 100% instant client preview & Base64 storage
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setProfile((prev) => ({ ...prev, logo: base64Url }));

        // Also upload to API in background
        try {
          const res = await fetch('/api/company/upload-logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Url }),
          });
          const data = await res.json();
          if (data.url) {
            setProfile((prev) => ({ ...prev, logo: data.url }));
          }
        } catch {
          // Keep base64Url fallback
        }
        toast.success('Photo loaded! Click "Save Profile" to update.');
      }
      setUploadingLogo(false);
    };

    reader.onerror = () => {
      toast.error('Failed to read image file');
      setUploadingLogo(false);
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/company/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          logo: profile.logo,
          website: profile.website,
          description: profile.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save profile');
      } else {
        setProfile(data.company);
        toast.success('Company profile updated successfully!');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500 text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-green-400" />
          <span>Loading company workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-white/[0.08] pb-6">
        <p className="text-[11px] uppercase font-bold tracking-widest text-green-400 mb-1">
          Workspace Settings
        </p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Company Profile
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage your organization credentials and public information displayed to candidates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Logo Upload Section */}
            <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Company Logo / Photo</h3>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.12] flex items-center justify-center shrink-0 shadow-inner">
                  {profile.logo ? (
                    <img src={profile.logo} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-green-400">
                      {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.07] hover:bg-white/[0.12] text-white border border-white/[0.1] transition disabled:opacity-50 cursor-pointer"
                    >
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Image</span>
                        </>
                      )}
                    </button>

                    {profile.logo && (
                      <button
                        type="button"
                        onClick={() => setProfile({ ...profile, logo: '' })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Supports PNG, JPG, JPEG, WEBP, or SVG. Uploaded image will be displayed on all your candidate links.
                  </p>
                </div>
              </div>
            </div>

            {/* General Info */}
            <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">General Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="e.g. Acme Technologies"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-green-500/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={profile.email}
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-white/[0.05] text-zinc-500 text-sm cursor-not-allowed"
                    />
                    <Mail className="absolute right-3.5 top-3 w-4 h-4 text-zinc-600" />
                  </div>
                  <span className="text-[10px] text-zinc-600 mt-1 block">
                    Account email is managed by your system administrator.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Website URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-green-500/50 transition"
                    />
                    <Globe className="absolute right-3.5 top-3 w-4 h-4 text-zinc-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    About / Description
                  </label>
                  <textarea
                    rows={4}
                    value={profile.description}
                    onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                    placeholder="Brief overview of your company, mission, and culture..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-green-500/50 transition resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-[#0c0c0e] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-500">
                Candidate View Preview
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
                Public Card
              </span>
            </div>

            <div className="text-center py-4 space-y-3">
              <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.12] flex items-center justify-center shadow-lg">
                {profile.logo ? (
                  <img src={profile.logo} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-green-400">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  {profile.name || 'Company Name'}
                </h3>
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 mt-1"
                  >
                    <span>{profile.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {profile.description ? (
                <p className="text-xs text-zinc-400 leading-relaxed px-2">
                  {profile.description}
                </p>
              ) : (
                <p className="text-xs text-zinc-600 italic px-2">
                  Your company bio will appear here on the test landing page.
                </p>
              )}
            </div>

            <div className="bg-zinc-900/60 rounded-xl p-3 border border-white/[0.04] text-[11px] text-zinc-500 text-center">
              This card is prominently displayed to candidates when they open any of your assessment links.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
