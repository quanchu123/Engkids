'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Search, Filter, RefreshCw, Loader2 } from 'lucide-react';

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

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Chờ thanh toán', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock },
  PAID: { label: 'Đã thanh toán', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle },
  CANCELLED: { label: 'Đã hủy', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle },
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/payment/transactions?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load');
      }
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải danh sách giao dịch';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleConfirm = async (orderCode: string) => {
    if (!confirm(`Xác nhận thanh toán cho đơn hàng ${orderCode}?`)) return;
    setConfirming(orderCode);
    try {
      const res = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      // Refresh list
      await fetchTransactions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi xác nhận';
      alert(`Lỗi: ${message}`);
    } finally {
      setConfirming(null);
    }
  };

  const filtered = transactions.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        t.order_code.toLowerCase().includes(q) ||
        t.user_id.toLowerCase().includes(q) ||
        t.plan_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = transactions.filter((t) => t.status === 'PENDING').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý giao dịch</h1>
          <p className="text-gray-400 text-sm mt-1">
            {pendingCount > 0 && (
              <span className="text-amber-400 font-medium">{pendingCount} đơn chờ xác nhận • </span>
            )}
            Tổng {transactions.length} giao dịch
          </p>
        </div>
        <button
          onClick={fetchTransactions}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm mã đơn hàng, user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          {['', 'PENDING', 'PAID', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {s === '' ? 'Tất cả' : STATUS_MAP[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Transactions table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 font-medium px-4 py-3">Mã đơn</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Gói</th>
                <th className="text-right text-gray-400 font-medium px-4 py-3">Số tiền</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Trạng thái</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Thời gian</th>
                <th className="text-center text-gray-400 font-medium px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <Loader2 className="mx-auto animate-spin mb-2" size={24} />
                    Đang tải...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    Không có giao dịch nào
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const status = STATUS_MAP[t.status] || STATUS_MAP.PENDING;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-purple-300">{t.order_code}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{t.plan_id}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {t.amount.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <div>{new Date(t.created_at).toLocaleDateString('vi-VN')}</div>
                        <div>{new Date(t.created_at).toLocaleTimeString('vi-VN')}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {t.status === 'PENDING' ? (
                          <button
                            onClick={() => handleConfirm(t.order_code)}
                            disabled={confirming === t.order_code}
                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            {confirming === t.order_code ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              '✓ Xác nhận'
                            )}
                          </button>
                        ) : t.status === 'PAID' ? (
                          <span className="text-green-500 text-xs">
                            {t.paid_at ? new Date(t.paid_at).toLocaleString('vi-VN') : '✓'}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
