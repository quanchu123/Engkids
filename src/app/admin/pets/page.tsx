'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronsUp, Loader2, PawPrint, RefreshCw, Search, UserRound } from 'lucide-react';
import { formatVietnamDateTime } from '@/lib/vietnam-time';

type SpeciesOption = {
  id: string;
  nameVi: string;
  emoji: string;
};

type AdminPet = {
  species: string;
  name: string;
  exp: number;
  level: number;
  speciesName: string;
  stageName: string | null;
  stageArt: string | null;
  isFullLevel: boolean;
};

type AdminPetUser = {
  id: string;
  authId: string | null;
  email: string | null;
  name: string | null;
  parentName: string | null;
  childAge: number | null;
  createdAt: string | null;
  registeredAt: string | null;
  lastSignInAt: string | null;
  updatedAt: string | null;
  pet: AdminPet | null;
};

function userLabel(user: AdminPetUser): string {
  return user.name || user.email || user.authId || user.id;
}

function formatAdminTime(value: string | null): string {
  return formatVietnamDateTime(value, 'Chưa có dữ liệu');
}

export default function AdminPetsPage() {
  const [users, setUsers] = useState<AdminPetUser[]>([]);
  const [species, setSpecies] = useState<SpeciesOption[]>([]);
  const [maxLevel, setMaxLevel] = useState(10);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [speciesDraft, setSpeciesDraft] = useState<Record<string, string>>({});

  const loadPets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/pets?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Không thể tải danh sách pet');

      const nextUsers = (data.users || []) as AdminPetUser[];
      const nextSpecies = (data.species || []) as SpeciesOption[];
      setUsers(nextUsers);
      setSpecies(nextSpecies);
      setMaxLevel(Number(data.maxLevel) || 10);
      setLevels(Object.fromEntries(nextUsers.map((user) => [user.id, user.pet?.level || 1])));
      setSpeciesDraft(Object.fromEntries(nextUsers.map((user) => [user.id, user.pet?.species || nextSpecies[0]?.id || 'ancient-dragon'])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách pet');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadPets();
  }, [loadPets]);

  const stats = useMemo(() => {
    const adopted = users.filter((user) => user.pet).length;
    const full = users.filter((user) => user.pet?.isFullLevel).length;
    return [
      { label: 'Tài khoản', value: users.length },
      { label: 'Đã có pet', value: adopted },
      { label: 'Full level', value: full },
    ];
  }, [users]);

  const updatePet = async (user: AdminPetUser, mode: 'full' | 'level') => {
    setSavingId(user.id);
    setError(null);
    try {
      const res = await fetch('/api/admin/pets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: user.id,
          mode,
          level: levels[user.id] || 1,
          speciesId: speciesDraft[user.id],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Cập nhật pet thất bại');

      const updated = data.user as AdminPetUser;
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setLevels((current) => ({ ...current, [updated.id]: updated.pet?.level || 1 }));
      setSpeciesDraft((current) => ({ ...current, [updated.id]: updated.pet?.species || current[updated.id] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật pet thất bại');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="admin-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Quản trị tài khoản</p>
          <h1 className="mt-1 text-2xl font-black text-admin-text">Pet của người dùng</h1>
          <p className="mt-1 text-sm text-admin-text-muted">Nâng pet lên full cấp {maxLevel}, hoặc hạ về cấp bạn chọn theo từng tài khoản.</p>
        </div>
        <button type="button" onClick={loadPets} className="admin-btn admin-btn-secondary" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Làm mới
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-card p-4">
            <div className="admin-stat-icon mb-3">
              <PawPrint className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-black uppercase tracking-wide text-admin-text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-black text-admin-text">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="admin-card">
        <div className="flex flex-col gap-3 border-b border-admin-border p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-black text-admin-text">Danh sách tài khoản</h2>
            <p className="text-sm text-admin-text-muted">{users.length} kết quả</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <label className="relative block w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-text-muted" aria-hidden="true" />
              <input
                type="text"
                placeholder="Tìm email, tên, auth id..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="admin-input pl-9"
              />
            </label>
            <button type="button" onClick={loadPets} className="admin-btn admin-btn-primary justify-center" disabled={loading}>
              Tìm
            </button>
          </div>
        </div>

        {error ? (
          <div className="border-b border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="p-10 text-center text-admin-text-muted">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" aria-hidden="true" />
            <p className="font-bold">Đang tải pet...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <UserRound className="mx-auto h-10 w-10 text-admin-text-muted" aria-hidden="true" />
            <h3 className="mt-3 font-black text-admin-text">Không có tài khoản phù hợp</h3>
            <p className="mt-1 text-sm text-admin-text-muted">Thử tìm bằng email hoặc tên khác.</p>
          </div>
        ) : (
          <div className="divide-y divide-admin-border">
            {users.map((user) => {
              const busy = savingId === user.id;
              return (
                <article key={user.id} className="grid gap-4 p-4 transition-colors hover:bg-admin-surface-muted xl:grid-cols-[1fr_auto] xl:items-center">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-admin-border">
                      {user.pet?.stageArt ? (
                        <Image src={user.pet.stageArt} alt={user.pet.stageName || user.pet.name} width={72} height={72} unoptimized className="h-16 w-16 object-contain" />
                      ) : (
                        <PawPrint className="h-9 w-9 text-admin-text-muted" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`admin-badge ${user.pet ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                          {user.pet ? `Cấp ${user.pet.level}` : 'Chưa có pet'}
                        </span>
                        {user.pet?.isFullLevel ? <span className="admin-badge admin-badge-neutral">Full evolution</span> : null}
                      </div>
                      <h3 className="truncate font-black text-admin-text">{userLabel(user)}</h3>
                      <p className="truncate text-sm text-admin-text-muted">{user.email || 'Chưa có email'}</p>
                      <p className="mt-2 text-xs font-bold text-admin-text-muted">
                        {user.pet ? `${user.pet.speciesName} · ${user.pet.stageName || 'Đang lớn'} · ${user.pet.exp} EXP` : 'Tài khoản chưa ấp pet. Admin có thể tạo pet khi set level.'}
                      </p>
                      <div className="mt-2 grid gap-1 text-xs font-bold text-admin-text-muted sm:grid-cols-3">
                        <p>Đăng ký: {formatAdminTime(user.registeredAt || user.createdAt)}</p>
                        <p>Đăng nhập: {formatAdminTime(user.lastSignInAt)}</p>
                        <p>Đồng bộ: {formatAdminTime(user.updatedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[150px_130px_auto_auto] xl:justify-end">
                    <select
                      value={speciesDraft[user.id] || species[0]?.id || ''}
                      onChange={(event) => setSpeciesDraft((current) => ({ ...current, [user.id]: event.target.value }))}
                      disabled={busy || !!user.pet}
                      className="admin-input bg-white text-sm font-bold"
                      title={user.pet ? 'Pet đã có giống, không đổi giống khi chỉnh level' : 'Chọn giống nếu cần tạo pet mới'}
                    >
                      {species.map((item) => (
                        <option key={item.id} value={item.id}>{item.emoji} {item.nameVi}</option>
                      ))}
                    </select>
                    <select
                      value={levels[user.id] || user.pet?.level || 1}
                      onChange={(event) => setLevels((current) => ({ ...current, [user.id]: Number(event.target.value) }))}
                      disabled={busy}
                      className="admin-input bg-white text-sm font-bold"
                    >
                      {Array.from({ length: maxLevel }, (_, index) => index + 1).map((level) => (
                        <option key={level} value={level}>Cấp {level}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => updatePet(user, 'level')} disabled={busy} className="admin-btn admin-btn-secondary justify-center">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Đặt level'}
                    </button>
                    <button type="button" onClick={() => updatePet(user, 'full')} disabled={busy} className="admin-btn admin-btn-primary justify-center">
                      <ChevronsUp className="h-4 w-4" aria-hidden="true" />
                      Full level
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
