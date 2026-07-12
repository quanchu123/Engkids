'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, Crown, FileUser, Loader2, MailCheck, RefreshCw, Search, Users } from 'lucide-react';
import { formatVietnamShortDateTime } from '@/lib/vietnam-time';

type AdminUserRow = {
  id: string;
  authId: string;
  email: string | null;
  name: string;
  provider: string | null;
  role: string;
  parentName: string;
  childAge: number | null;
  accountType: string;
  isPremium: boolean;
  premiumUntil: string | null;
  location: string;
  emailConfirmedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  updatedAt: string | null;
  isAnonymous: boolean;
  hasProfile: boolean;
};

function formatTime(value: string | null): string {
  return formatVietnamShortDateTime(value, 'Chưa có');
}

function isRecentSignIn(value: string | null): boolean {
  if (!value) return false;
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return false;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return createdAt.getTime() >= sevenDaysAgo;
}

function getAccountBadgeClass(accountType: string): string {
  if (accountType === 'premium') return 'admin-badge-success';
  if (accountType === 'trial') return 'admin-badge-warning';
  return 'admin-badge-neutral';
}

function getAccountLabel(accountType: string): string {
  if (accountType === 'premium') return 'Premium';
  if (accountType === 'trial') return 'Trial';
  return 'Free';
}

function getVerificationBadgeClass(confirmed: boolean): string {
  return confirmed ? 'admin-badge-success' : 'admin-badge-warning';
}

function getProfileBadgeClass(hasProfile: boolean): string {
  return hasProfile ? 'admin-badge-success' : 'admin-badge-danger';
}

function getProviderLabel(provider: string | null): string {
  if (!provider) return 'Auth';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store', credentials: 'include' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể tải danh sách users');
      }

      setUsers((payload.users || []) as AdminUserRow[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách users';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => (
      user.name.toLowerCase().includes(query) ||
      String(user.authId).toLowerCase().includes(query) ||
      String(user.email || '').toLowerCase().includes(query) ||
      user.parentName.toLowerCase().includes(query) ||
      String(user.location || '').toLowerCase().includes(query) ||
      String(user.provider || '').toLowerCase().includes(query) ||
      String(user.accountType || '').toLowerCase().includes(query) ||
      String(user.role || '').toLowerCase().includes(query)
    ));
  }, [search, users]);

  const stats = useMemo(() => {
    const total = users.length;
    const withProfile = users.filter((user) => user.hasProfile).length;
    const verified = users.filter((user) => Boolean(user.emailConfirmedAt)).length;
    const premium = users.filter((user) => user.isPremium || user.accountType === 'premium').length;
    const active7d = users.filter((user) => isRecentSignIn(user.lastSignInAt)).length;

    return [
      { label: 'Tổng users', value: total, icon: Users },
      { label: 'Có profile', value: withProfile, icon: FileUser },
      { label: 'Đã xác thực', value: verified, icon: MailCheck },
      { label: 'Premium', value: premium, icon: Crown },
      { label: 'Hoạt động 7 ngày', value: active7d, icon: Clock3 },
    ];
  }, [users]);

  return (
    <div className="space-y-6">
      <header className="admin-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Quản lý tài khoản</p>
          <h1 className="mt-1 text-2xl font-black text-admin-text">Users</h1>
          <p className="mt-1 text-sm font-semibold text-admin-text-muted">
            Bảng thông tin người dùng kiểu Supabase, gộp dữ liệu từ Auth và `user_profiles` để xem và quản lý nhanh.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadUsers('refresh')}
          disabled={refreshing}
          className="admin-btn admin-btn-secondary"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          Làm mới
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="admin-card p-4">
              <div className="admin-stat-icon mb-3">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-xs font-black uppercase tracking-wide text-admin-text-muted">{stat.label}</p>
              <p className="mt-1 text-2xl font-black text-admin-text">{stat.value}</p>
            </div>
          );
        })}
      </section>

      <section className="admin-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-admin-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-black text-admin-text">Danh sách users</h2>
            <p className="text-sm text-admin-text-muted">
              {filteredUsers.length} kết quả · {users.length} tài khoản đã tải
            </p>
          </div>
          <label className="relative block w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-text-muted" aria-hidden="true" />
            <input
              type="text"
              placeholder="Tìm theo email, tên, auth ID, provider, phụ huynh..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="admin-input pl-9"
            />
          </label>
        </div>

        {error && (
          <div className="border-b border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        {loading && filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-admin-text-muted">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" aria-hidden="true" />
            <p className="font-bold">Đang tải users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="mx-auto h-10 w-10 text-admin-text-muted" aria-hidden="true" />
            <h3 className="mt-3 font-black text-admin-text">Không có user nào phù hợp</h3>
            <p className="mt-1 text-sm text-admin-text-muted">Thử xoá bớt từ khoá tìm kiếm hoặc làm mới dữ liệu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-admin-border">
                  <th className="px-4 py-3 text-left font-black text-slate-700">User</th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">Auth ID</th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">Profile</th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">Vị trí</th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">Tài khoản</th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">Xác thực</th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">Đăng ký</th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">Premium đến</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {filteredUsers.map((user) => {
                  const accountBadge = getAccountBadgeClass(user.accountType);
                  const verificationBadge = getVerificationBadgeClass(Boolean(user.emailConfirmedAt));
                  const profileBadge = getProfileBadgeClass(user.hasProfile);

                  return (
                    <tr key={user.id} className="border-b border-admin-border last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 align-top">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-black text-admin-text">{user.name}</span>
                            {user.isAnonymous && <span className="admin-badge admin-badge-neutral">Anonymous</span>}
                          </div>
                          <p className="truncate text-sm text-admin-text-muted">{user.email || 'Chưa có email'}</p>
                          <p className="mt-2 text-xs font-bold text-admin-text-muted">
                            Provider: {getProviderLabel(user.provider)} · Role: {user.role}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span className="font-mono text-xs font-bold text-admin-primary">{user.authId}</span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <span className={`admin-badge ${profileBadge}`}>
                            {user.hasProfile ? 'Có profile' : 'Thiếu profile'}
                          </span>
                          <div className="text-xs font-bold text-slate-600">
                            <div>Parent: {user.parentName}</div>
                            <div>Child age: {user.childAge ?? '---'}</div>
                            {user.updatedAt && <div>Cập nhật: {formatTime(user.updatedAt)}</div>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <span className="admin-badge admin-badge-neutral">{user.location}</span>
                          <div className="text-xs font-bold text-slate-600">Tự gán nếu thiếu dữ liệu gốc</div>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <span className={`admin-badge ${accountBadge}`}>
                            {getAccountLabel(user.accountType)}
                          </span>
                          <div className="text-xs font-bold text-slate-600">
                            <div>{user.isPremium ? 'Premium đang bật' : 'Tài khoản thường'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <span className={`admin-badge ${verificationBadge}`}>
                            {user.emailConfirmedAt ? 'Đã xác thực' : 'Chưa xác thực'}
                          </span>
                          <div className="text-xs font-bold text-slate-600">
                            <div>Xác nhận: {formatTime(user.emailConfirmedAt)}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top font-semibold text-slate-600">
                        {formatTime(user.createdAt)}
                      </td>

                      <td className="px-4 py-3 align-top">
                        {user.premiumUntil ? (
                          <div className="flex flex-col gap-2">
                            <span className="admin-badge admin-badge-success">Đang premium</span>
                            <span className="text-xs font-bold text-slate-600">{formatTime(user.premiumUntil)}</span>
                          </div>
                        ) : (
                          <span className="admin-badge admin-badge-neutral">Không có</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
