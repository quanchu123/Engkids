'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Crown, Loader2, Save, UserRound } from 'lucide-react';
import Header from '@/components/layout/Header';

const NAME_KEY = 'engkids.childName';

interface AccountProfile {
  email: string | null;
  name: string | null;
  parent_name: string | null;
  child_age: number | null;
  parent_age: number | null;
  gender: string | null;
  address: string | null;
  account_type: string | null;
  is_premium: boolean | null;
  premium_until: string | null;
}

interface ProfileResponse {
  profile: AccountProfile;
  premium: {
    active: boolean;
    until: string | null;
    accountType: string | null;
  };
  email?: string | null;
}

interface FormState {
  name: string;
  parentName: string;
  childAge: string;
  parentAge: string;
  gender: string;
  address: string;
}

const blankForm: FormState = {
  name: '',
  parentName: '',
  childAge: '',
  parentAge: '',
  gender: '',
  address: '',
};

function toForm(profile: AccountProfile): FormState {
  return {
    name: profile.name ?? '',
    parentName: profile.parent_name ?? '',
    childAge: profile.child_age ? String(profile.child_age) : '',
    parentAge: profile.parent_age ? String(profile.parent_age) : '',
    gender: profile.gender ?? '',
    address: profile.address ?? '',
  };
}

function formatPremiumDate(value: string | null): string {
  if (!value) return 'Chưa có hạn Premium';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [premium, setPremium] = useState<ProfileResponse['premium'] | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/account/profile', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Không tải được thông tin tài khoản.');
        }

        if (!active) return;

        setProfile(data.profile);
        setPremium(data.premium);
        setForm(toForm(data.profile));
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Không tải được thông tin tài khoản.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const premiumStatus = useMemo(() => {
    if (!premium?.active) return 'Chưa kích hoạt Premium';
    return `Premium đến ${formatPremiumDate(premium.until)}`;
  }, [premium]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không lưu được thông tin.');
      }

      setProfile(data.profile);
      setPremium(data.premium);
      setForm(toForm(data.profile));
      window.localStorage.setItem(NAME_KEY, data.profile.name ?? '');
      setMessage('Đã lưu thông tin tài khoản.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được thông tin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-pink-50 to-amber-50 pb-24">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href="/" className="mb-3 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-violet-600">
                <ArrowLeft size={16} />
                Trang chủ
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow">
                  <UserRound size={26} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Thông tin tài khoản</h1>
                  <p className="text-sm font-bold text-slate-500">{profile?.email || 'Tài khoản Engkids'}</p>
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black shadow ${
              premium?.active ? 'bg-amber-300 text-amber-950' : 'bg-white text-slate-600'
            }`}>
              <Crown size={18} fill={premium?.active ? 'currentColor' : 'none'} />
              {premium?.active ? 'Premium' : 'Free'}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] bg-white shadow-xl">
              <Loader2 className="animate-spin text-violet-500" size={36} />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-5 shadow-xl sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Họ tên trẻ" required>
                    <input
                      required
                      value={form.name}
                      onChange={(event) => updateField('name', event.target.value)}
                      className="account-input"
                      maxLength={80}
                    />
                  </Field>

                  <Field label="Tuổi của trẻ" required>
                    <select
                      required
                      value={form.childAge}
                      onChange={(event) => updateField('childAge', event.target.value)}
                      className="account-input"
                    >
                      <option value="">Chọn tuổi</option>
                      {Array.from({ length: 18 }, (_, index) => index + 1).map((age) => (
                        <option key={age} value={age}>{age} tuổi</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Họ tên bố mẹ">
                    <input
                      value={form.parentName}
                      onChange={(event) => updateField('parentName', event.target.value)}
                      className="account-input"
                      maxLength={80}
                    />
                  </Field>

                  <Field label="Tuổi của bố mẹ">
                    <select
                      value={form.parentAge}
                      onChange={(event) => updateField('parentAge', event.target.value)}
                      className="account-input"
                    >
                      <option value="">Chọn tuổi</option>
                      {Array.from({ length: 83 }, (_, index) => index + 18).map((age) => (
                        <option key={age} value={age}>{age} tuổi</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Giới tính">
                    <select
                      value={form.gender}
                      onChange={(event) => updateField('gender', event.target.value)}
                      className="account-input"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </Field>

                  <Field label="Email">
                    <input value={profile?.email ?? ''} className="account-input bg-slate-50 text-slate-400" disabled />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Địa chỉ">
                      <input
                        value={form.address}
                        onChange={(event) => updateField('address', event.target.value)}
                        className="account-input"
                        maxLength={200}
                      />
                    </Field>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    <Check size={16} />
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-3 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Lưu thông tin
                </button>
              </form>

              <aside className="space-y-4">
                <div className="rounded-[2rem] bg-white p-5 shadow-xl">
                  <div className="mb-4 flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      premium?.active ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Crown size={23} fill={premium?.active ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Trạng thái</p>
                      <h2 className="text-lg font-black text-slate-950">{premium?.active ? 'Premium' : 'Free'}</h2>
                    </div>
                  </div>
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                    {premiumStatus}
                  </p>
                  {premium?.active && (
                    <p className="mt-3 text-xs font-bold text-slate-400">
                      Hết hạn: {formatPremiumDate(premium.until)}
                    </p>
                  )}
                </div>

                <div className="rounded-[2rem] bg-white p-5 shadow-xl">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Loại tài khoản</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{premium?.accountType || profile?.account_type || 'free'}</p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">
        {label}
        {required && <span className="text-pink-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
