'use client';

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock3,
  Crown,
  FileUser,
  Loader2,
  MailCheck,
  PencilLine,
  RefreshCw,
  Save,
  Search,
  Users,
  X,
} from 'lucide-react';
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

type SortKey =
  | 'name'
  | 'email'
  | 'authId'
  | 'parentName'
  | 'childAge'
  | 'location'
  | 'accountType'
  | 'emailConfirmedAt'
  | 'createdAt'
  | 'premiumUntil';

type SortDirection = 'asc' | 'desc';
type EditableField = 'name' | 'email' | 'parentName' | 'childAge' | 'location';
type UserDraft = Record<EditableField, string>;
type MutationMessage = {
  type: 'success' | 'error';
  text: string;
};

const TEXT_COLLATOR = new Intl.Collator('vi', { sensitivity: 'base', numeric: true });
const ADMIN_ROLE_VALUES = new Set(['admin', 'super_admin', 'god']);
const TEST_PATTERNS = [/test/i, /demo/i, /sample/i, /fake/i, /qa/i, /sandbox/i, /staging/i, /temp/i, /bot/i];

function formatTime(value: string | null): string {
  return formatVietnamShortDateTime(value, 'Chưa có');
}

function isRecentSignIn(value: string | null): boolean {
  if (!value) return false;
  const signInAt = new Date(value);
  if (Number.isNaN(signInAt.getTime())) return false;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return signInAt.getTime() >= sevenDaysAgo;
}

function normalizeAccountType(value: string): string {
  return value.trim().toLowerCase();
}

function getAccountBadgeClass(accountType: string): string {
  const normalized = normalizeAccountType(accountType);
  if (normalized === 'premium') return 'admin-badge-success';
  if (normalized === 'trial') return 'admin-badge-warning';
  if (normalized === 'admin' || normalized === 'super_admin' || normalized === 'god') return 'admin-badge-info';
  return 'admin-badge-neutral';
}

function getAccountLabel(accountType: string): string {
  const normalized = normalizeAccountType(accountType);
  if (normalized === 'premium') return 'Premium';
  if (normalized === 'trial') return 'Trial';
  if (normalized === 'admin' || normalized === 'super_admin' || normalized === 'god') return 'Admin';
  if (!normalized) return 'Free';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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

function compareText(a: string, b: string, direction: SortDirection): number {
  const result = TEXT_COLLATOR.compare(a, b);
  return direction === 'asc' ? result : -result;
}

function compareNullableNumber(a: number | null, b: number | null, direction: SortDirection): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function compareNullableDate(a: string | null, b: string | null, direction: SortDirection): number {
  const timeA = a ? new Date(a).getTime() : Number.NaN;
  const timeB = b ? new Date(b).getTime() : Number.NaN;

  const aMissing = Number.isNaN(timeA);
  const bMissing = Number.isNaN(timeB);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  return direction === 'asc' ? timeA - timeB : timeB - timeA;
}

function isAdminRole(value: string | null | undefined): boolean {
  if (!value) return false;
  return ADMIN_ROLE_VALUES.has(value.trim().toLowerCase());
}

function isTestAccount(user: AdminUserRow): boolean {
  const haystack = [
    user.id,
    user.authId,
    user.email,
    user.name,
    user.provider,
    user.role,
    user.parentName,
    user.location,
    user.accountType,
  ]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join(' ')
    .toLowerCase();

  return TEST_PATTERNS.some((pattern) => pattern.test(haystack));
}

function shouldExcludeFromStats(user: AdminUserRow): boolean {
  return (
    isAdminRole(user.role) ||
    isAdminRole(user.accountType) ||
    isTestAccount(user)
  );
}

type SortHeaderProps = {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'center' | 'right';
};

function SortHeader({ label, sortKey, activeSortKey, sortDirection, onSort, align = 'left' }: SortHeaderProps) {
  const active = activeSortKey === sortKey;
  const Icon = active ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={[
        'flex w-full items-center gap-1.5 font-black transition',
        align === 'center' ? 'justify-center text-center' : '',
        align === 'right' ? 'justify-end text-right' : '',
        align === 'left' ? 'justify-start text-left' : '',
        active ? 'text-admin-primary' : 'text-slate-700 hover:text-admin-primary',
      ].join(' ')}
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutationMessage, setMutationMessage] = useState<MutationMessage | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editingAuthId, setEditingAuthId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [savingAuthId, setSavingAuthId] = useState<string | null>(null);

  const loadUsers = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);
    setMutationMessage(null);
    setEditingAuthId(null);
    setDraft(null);

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

  useEffect(() => {
    if (!mutationMessage) return undefined;

    const timeout = window.setTimeout(() => setMutationMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [mutationMessage]);

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
      String(user.role || '').toLowerCase().includes(query) ||
      String(user.childAge ?? '').toLowerCase().includes(query)
    ));
  }, [search, users]);

  const sortedUsers = useMemo(() => {
    const rows = [...filteredUsers];
    rows.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return compareText(a.name, b.name, sortDirection);
        case 'email':
          return compareText(a.email || '', b.email || '', sortDirection);
        case 'authId':
          return compareText(a.authId, b.authId, sortDirection);
        case 'parentName':
          return compareText(a.parentName, b.parentName, sortDirection);
        case 'childAge':
          return compareNullableNumber(a.childAge, b.childAge, sortDirection);
        case 'location':
          return compareText(a.location, b.location, sortDirection);
        case 'accountType':
          return compareText(getAccountLabel(a.accountType), getAccountLabel(b.accountType), sortDirection);
        case 'emailConfirmedAt':
          return compareNullableDate(a.emailConfirmedAt, b.emailConfirmedAt, sortDirection);
        case 'createdAt':
          return compareNullableDate(a.createdAt, b.createdAt, sortDirection);
        case 'premiumUntil':
          return compareNullableDate(a.premiumUntil, b.premiumUntil, sortDirection);
        default:
          return 0;
      }
    });
    return rows;
  }, [filteredUsers, sortDirection, sortKey]);

  const statsUsers = useMemo(() => users.filter((user) => !shouldExcludeFromStats(user)), [users]);
  const excludedFromStats = users.length - statsUsers.length;

  const stats = useMemo(() => {
    const total = statsUsers.length;
    const withProfile = statsUsers.filter((user) => user.hasProfile).length;
    const verified = statsUsers.filter((user) => Boolean(user.emailConfirmedAt)).length;
    const premium = statsUsers.filter((user) => user.isPremium || user.accountType === 'premium').length;
    const active7d = statsUsers.filter((user) => isRecentSignIn(user.lastSignInAt)).length;

    return [
      { label: 'Tổng users', value: total, icon: Users },
      { label: 'Có profile', value: withProfile, icon: FileUser },
      { label: 'Đã xác thực', value: verified, icon: MailCheck },
      { label: 'Premium', value: premium, icon: Crown },
      { label: 'Hoạt động 7 ngày', value: active7d, icon: Clock3 },
    ];
  }, [statsUsers]);

  const beginEdit = useCallback((user: AdminUserRow) => {
    if (savingAuthId) return;
    if (editingAuthId === user.authId) return;

    setMutationMessage(null);
    setEditingAuthId(user.authId);
    setDraft({
      name: user.name,
      email: user.email ?? '',
      parentName: user.parentName,
      childAge: user.childAge === null ? '' : String(user.childAge),
      location: user.location,
    });
  }, [editingAuthId, savingAuthId]);

  const cancelEdit = useCallback(() => {
    setEditingAuthId(null);
    setDraft(null);
  }, []);

  const updateDraft = useCallback((field: EditableField, value: string) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
  }, [sortKey]);

  const saveUser = useCallback(async (authId: string) => {
    const currentDraft = draft;
    const currentUser = users.find((user) => user.authId === authId);

    if (!currentUser || !currentDraft) return;

    const nextName = currentDraft.name.trim();
    const nextEmail = currentDraft.email.trim();
    const nextParentName = currentDraft.parentName.trim();
    const nextChildAgeRaw = currentDraft.childAge.trim();
    const nextLocation = currentDraft.location.trim();

    const currentName = currentUser.name.trim();
    const currentEmail = (currentUser.email ?? '').trim().toLowerCase();
    const currentParentName = currentUser.parentName.trim();
    const currentChildAge = currentUser.childAge === null ? '' : String(currentUser.childAge);
    const currentLocation = currentUser.location.trim();

    const updates: Record<string, string | number | null> = {};

    if (nextName !== currentName) {
      updates.name = nextName;
    }

    if (nextEmail.toLowerCase() !== currentEmail) {
      updates.email = nextEmail;
    }

    if (nextParentName !== currentParentName) {
      updates.parentName = nextParentName;
    }

    if (nextChildAgeRaw !== currentChildAge) {
      updates.childAge = nextChildAgeRaw === '' ? null : nextChildAgeRaw;
    }

    if (nextLocation !== currentLocation) {
      updates.location = nextLocation;
    }

    if (Object.keys(updates).length === 0) {
      cancelEdit();
      setMutationMessage({ type: 'success', text: 'Không có thay đổi nào để lưu.' });
      return;
    }

    setSavingAuthId(authId);
    setMutationMessage(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authId, updates }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Không thể lưu thay đổi');
      }

      if (payload.user) {
        setUsers((current) => current.map((user) => (user.authId === authId ? (payload.user as AdminUserRow) : user)));
      } else {
        await loadUsers('refresh');
      }

      cancelEdit();
      setMutationMessage({ type: 'success', text: 'Đã cập nhật thông tin user.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể lưu thay đổi';
      setMutationMessage({ type: 'error', text: message });
    } finally {
      setSavingAuthId(null);
    }
  }, [cancelEdit, draft, loadUsers, users]);

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>, authId: string) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      void saveUser(authId);
    }
  };

  return (
    <div className="space-y-6">
      <header className="admin-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Quản lý tài khoản</p>
          <h1 className="mt-1 text-2xl font-black text-admin-text">Users</h1>
          <p className="mt-1 text-sm font-semibold text-admin-text-muted">
            Bảng thông tin người dùng kiểu Supabase, gộp dữ liệu từ Auth và `user_profiles` để xem, sort và sửa nhanh.
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
              {sortedUsers.length} kết quả · {users.length} tài khoản đã tải
            </p>
            <p className="mt-1 text-xs font-semibold text-admin-text-muted">
              Nhấp đúp vào một dòng để sửa nhanh. Bấm tiêu đề cột để sort.
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

        {excludedFromStats > 0 && (
          <div className="border-b border-sky-100 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-700">
            Đã loại {excludedFromStats} tài khoản admin/test khỏi thống kê.
          </div>
        )}

        {mutationMessage && (
          <div className={`border-b p-4 text-sm font-bold ${
            mutationMessage.type === 'error'
              ? 'border-rose-100 bg-rose-50 text-rose-700'
              : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}>
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{mutationMessage.text}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="border-b border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        {loading && sortedUsers.length === 0 ? (
          <div className="p-10 text-center text-admin-text-muted">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" aria-hidden="true" />
            <p className="font-bold">Đang tải users...</p>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="mx-auto h-10 w-10 text-admin-text-muted" aria-hidden="true" />
            <h3 className="mt-3 font-black text-admin-text">Không có user nào phù hợp</h3>
            <p className="mt-1 text-sm text-admin-text-muted">Thử xoá bớt từ khoá tìm kiếm hoặc làm mới dữ liệu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1900px] text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-admin-border">
                  <th className="px-4 py-3 text-left font-black text-slate-700">
                    <SortHeader
                      label="User"
                      sortKey="name"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">
                    <SortHeader
                      label="Email"
                      sortKey="email"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">
                    <SortHeader
                      label="Auth ID"
                      sortKey="authId"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">
                    <SortHeader
                      label="Phụ huynh"
                      sortKey="parentName"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-center font-black text-slate-700">
                    <SortHeader
                      label="Tuổi"
                      sortKey="childAge"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      align="center"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">
                    <SortHeader
                      label="Vị trí"
                      sortKey="location"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">
                    <SortHeader
                      label="Tài khoản"
                      sortKey="accountType"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">
                    <SortHeader
                      label="Xác thực"
                      sortKey="emailConfirmedAt"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">
                    <SortHeader
                      label="Đăng ký"
                      sortKey="createdAt"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">
                    <SortHeader
                      label="Premium đến"
                      sortKey="premiumUntil"
                      activeSortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-black text-slate-700">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {sortedUsers.map((user) => {
                  const accountBadge = getAccountBadgeClass(user.accountType);
                  const verificationBadge = getVerificationBadgeClass(Boolean(user.emailConfirmedAt));
                  const profileBadge = getProfileBadgeClass(user.hasProfile);
                  const isEditing = editingAuthId === user.authId;
                  const isSaving = savingAuthId === user.authId;

                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-admin-border last:border-0 ${isEditing ? 'bg-sky-50/70' : 'hover:bg-slate-50'}`}
                      onDoubleClick={() => beginEdit(user)}
                      title="Nhấp đúp để sửa nhanh"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="min-w-0 space-y-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draft?.name ?? ''}
                              onChange={(event) => updateDraft('name', event.target.value)}
                              onKeyDown={(event) => handleEditKeyDown(event, user.authId)}
                              disabled={isSaving}
                              autoFocus
                              className="admin-input bg-white text-sm font-black"
                            />
                          ) : (
                            <div className="truncate font-black text-admin-text">{user.name}</div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-admin-text-muted">
                            <span>Provider: {getProviderLabel(user.provider)}</span>
                            <span>Role: {user.role}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`admin-badge ${profileBadge}`}>
                              {user.hasProfile ? 'Có profile' : 'Thiếu profile'}
                            </span>
                            {user.isAnonymous && <span className="admin-badge admin-badge-neutral">Anonymous</span>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <input
                            type="email"
                            value={draft?.email ?? ''}
                            onChange={(event) => updateDraft('email', event.target.value)}
                            onKeyDown={(event) => handleEditKeyDown(event, user.authId)}
                            disabled={isSaving}
                            className="admin-input bg-white text-sm font-semibold"
                          />
                        ) : (
                          <span className="truncate font-semibold text-slate-700">{user.email || 'Chưa có email'}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span className="font-mono text-xs font-bold text-admin-primary">{user.authId}</span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draft?.parentName ?? ''}
                            onChange={(event) => updateDraft('parentName', event.target.value)}
                            onKeyDown={(event) => handleEditKeyDown(event, user.authId)}
                            disabled={isSaving}
                            className="admin-input bg-white text-sm font-semibold"
                          />
                        ) : (
                          <span className="font-semibold text-slate-700">{user.parentName}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            max={18}
                            step={1}
                            value={draft?.childAge ?? ''}
                            onChange={(event) => updateDraft('childAge', event.target.value)}
                            onKeyDown={(event) => handleEditKeyDown(event, user.authId)}
                            disabled={isSaving}
                            className="admin-input bg-white text-center text-sm font-semibold"
                          />
                        ) : (
                          <div className="text-center font-semibold text-slate-700">
                            {user.childAge ?? '---'}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draft?.location ?? ''}
                            onChange={(event) => updateDraft('location', event.target.value)}
                            onKeyDown={(event) => handleEditKeyDown(event, user.authId)}
                            disabled={isSaving}
                            className="admin-input bg-white text-sm font-semibold"
                          />
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span className="admin-badge admin-badge-neutral">{user.location}</span>
                            <div className="text-xs font-bold text-slate-600">Tự gán nếu thiếu dữ liệu gốc</div>
                          </div>
                        )}
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

                      <td className="px-4 py-3 align-top">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void saveUser(user.authId)}
                                disabled={isSaving}
                                className="admin-btn admin-btn-primary h-9 min-h-0 px-3 text-xs"
                              >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isSaving}
                                className="admin-btn admin-btn-secondary h-9 min-h-0 px-3 text-xs"
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                                Hủy
                              </button>
                            </div>
                            <div className="text-[11px] font-semibold text-admin-text-muted">Enter để lưu · Esc để hủy</div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => beginEdit(user)}
                              className="admin-btn admin-btn-secondary h-9 min-h-0 px-3 text-xs"
                            >
                              <PencilLine className="h-4 w-4" aria-hidden="true" />
                              Sửa
                            </button>
                            <div className="text-[11px] font-semibold text-admin-text-muted">
                              {user.updatedAt ? `Cập nhật: ${formatTime(user.updatedAt)}` : 'Nhấp đúp để sửa'}
                            </div>
                          </div>
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
