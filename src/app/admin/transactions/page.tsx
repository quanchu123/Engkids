'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle, Clock, Filter, Loader2, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';
import { authFetch } from '@/lib/admin-auth-client';

interface Transaction {
  id: string;
  user_id: string;
  order_code: string;
  amount: number;
  plan_id: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  user_profiles?: { display_name: string | null; auth_id: string } | null;
}

const STATUS_MAP: Record<string, { label: string; badge: string; icon: LucideIcon }> = {
  PENDING: { label: 'Chờ thanh toán', badge: 'admin-badge-warning', icon: Clock },
  PAID: { label: 'Đã thanh toán', badge: 'admin-badge-success', icon: CheckCircle },
  CANCELLED: { label: 'Đã hủy', badge: 'admin-badge-danger', icon: XCircle },
};

function formatCurrency(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const fetchTransactions = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const response = await authFetch(`/api/payment/transactions?${params}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể tải danh sách giao dịch');
      }

      setTransactions(payload.transactions || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách giao dịch';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchTransactions('refresh');
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [fetchTransactions]);

  const handleConfirm = async (orderCode: string) => {
    if (!confirm(`Xác nhận thanh toán cho đơn hàng ${orderCode}?`)) return;

    setConfirming(orderCode);
    try {
      const response = await authFetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể xác nhận thanh toán');
      }

      await fetchTransactions('refresh');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi xác nhận';
      alert(`Lỗi: ${message}`);
    } finally {
      setConfirming(null);
    }
  };

  const handleDeletePending = async (orderCode: string) => {
    if (!confirm(`Xóa giao dịch chờ thanh toán ${orderCode}?`)) return;

    setDeleting(orderCode);
    try {
      const params = new URLSearchParams({ orderCode });
      const response = await authFetch(`/api/payment/transactions?${params}`, {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể xóa giao dịch');
      }

      setTransactions((current) => current.filter((transaction) => String(transaction.order_code) !== orderCode));
      await fetchTransactions('refresh');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi xóa giao dịch';
      alert(`Lỗi: ${message}`);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;

    return transactions.filter((transaction) => (
      String(transaction.order_code).toLowerCase().includes(query) ||
      transaction.user_id.toLowerCase().includes(query) ||
      transaction.plan_id.toLowerCase().includes(query) ||
      transaction.user_profiles?.display_name?.toLowerCase().includes(query)
    ));
  }, [search, transactions]);

  const paidRevenue = transactions
    .filter((transaction) => transaction.status === 'PAID')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const pendingCount = transactions.filter((transaction) => transaction.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <header className="admin-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Thanh toán</p>
          <h1 className="mt-1 text-2xl font-black text-admin-text">Quản lý giao dịch</h1>
          <p className="mt-1 text-sm font-bold text-slate-600">
            {pendingCount > 0 && <span className="text-amber-700">{pendingCount} đơn chờ xác nhận · </span>}
            Tổng {transactions.length} giao dịch · Đã thu {formatCurrency(paidRevenue)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchTransactions('refresh')}
          disabled={refreshing}
          className="admin-btn admin-btn-secondary"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          Làm mới
        </button>
      </header>

      <section className="admin-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="text"
              placeholder="Tìm mã đơn hàng, user ID, tên học viên..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="admin-input pl-9"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600" aria-hidden="true" />
            {['', 'PENDING', 'PAID', 'CANCELLED'].map((status) => (
              <button
                key={status || 'ALL'}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`admin-tab ${statusFilter === status ? 'admin-tab-active' : 'bg-admin-surface-muted text-slate-700 hover:text-admin-primary'}`}
              >
                {status === '' ? 'Tất cả' : STATUS_MAP[status]?.label || status}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="admin-card flex items-start gap-3 border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-black">Không tải được giao dịch</p>
            <p className="text-sm font-semibold">{error}</p>
          </div>
        </div>
      )}

      <section className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border bg-slate-50">
                <th className="px-4 py-3 text-left font-black text-slate-700">Mã đơn</th>
                <th className="px-4 py-3 text-left font-black text-slate-700">Gói</th>
                <th className="px-4 py-3 text-right font-black text-slate-700">Số tiền</th>
                <th className="px-4 py-3 text-left font-black text-slate-700">Trạng thái</th>
                <th className="px-4 py-3 text-left font-black text-slate-700">Thời gian</th>
                <th className="px-4 py-3 text-center font-black text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-bold text-slate-600">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-admin-primary" aria-hidden="true" />
                    Đang tải giao dịch...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-bold text-slate-600">
                    Không có giao dịch nào
                  </td>
                </tr>
              ) : (
                filtered.map((transaction) => {
                  const status = STATUS_MAP[transaction.status] || STATUS_MAP.PENDING;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={transaction.id} className="border-b border-admin-border last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-mono font-black text-admin-primary">{transaction.order_code}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-admin-text">{transaction.plan_id}</td>
                      <td className="px-4 py-3 text-right font-black text-admin-text">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`admin-badge ${status.badge} gap-1.5`}>
                          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        <div>Tạo: {formatDateTime(transaction.created_at)}</div>
                        {transaction.paid_at && <div className="text-emerald-700">Trả: {formatDateTime(transaction.paid_at)}</div>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {transaction.status === 'PENDING' ? (
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirm(String(transaction.order_code))}
                              disabled={confirming === String(transaction.order_code) || deleting === String(transaction.order_code)}
                              className="admin-btn admin-btn-primary min-h-[36px] px-3 text-xs"
                            >
                              {confirming === String(transaction.order_code) ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                'Xác nhận'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePending(String(transaction.order_code))}
                              disabled={deleting === String(transaction.order_code) || confirming === String(transaction.order_code)}
                              className="admin-btn admin-btn-danger min-h-[36px] px-3 text-xs"
                              title="Xóa giao dịch chờ thanh toán"
                            >
                              {deleting === String(transaction.order_code) ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  Xóa
                                </>
                              )}
                            </button>
                          </div>
                        ) : transaction.status === 'PAID' ? (
                          <span className="font-black text-emerald-700">Đã thu</span>
                        ) : (
                          <span className="font-bold text-slate-500">Không có</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
