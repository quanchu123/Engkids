'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  LineChart,
  Loader2,
  ReceiptText,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

interface RevenueSummary {
  totalRevenue: number;
  monthRevenue: number;
  todayRevenue: number;
  pendingRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  conversionRate: number;
}

interface DailyRevenuePoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

interface PlanRevenuePoint {
  planId: string;
  label: string;
  revenue: number;
  orders: number;
  percent: number;
}

interface RecentPaidTransaction {
  id: string;
  orderCode: string;
  amount: number;
  planId: string;
  planLabel: string;
  paidAt: string;
}

interface RevenueDashboardData {
  summary: RevenueSummary;
  dailyRevenue: DailyRevenuePoint[];
  planBreakdown: PlanRevenuePoint[];
  recentPaidTransactions: RecentPaidTransaction[];
  generatedAt: string;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

function formatCurrency(value: number): string {
  return `${currencyFormatter.format(value)}đ`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/admin/revenue', { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể tải thống kê doanh thu');
      }

      setData(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải thống kê doanh thu';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const maxDailyRevenue = useMemo(() => {
    if (!data?.dailyRevenue.length) return 0;
    return Math.max(...data.dailyRevenue.map((point) => point.revenue));
  }, [data]);

  const statCards = data ? [
    {
      label: 'Tổng doanh thu',
      value: formatCurrency(data.summary.totalRevenue),
      hint: `${data.summary.paidOrders} đơn đã thanh toán`,
      icon: DollarSign,
    },
    {
      label: 'Tháng này',
      value: formatCurrency(data.summary.monthRevenue),
      hint: 'Tính theo ngày thanh toán',
      icon: CalendarDays,
    },
    {
      label: 'Hôm nay',
      value: formatCurrency(data.summary.todayRevenue),
      hint: 'Doanh thu trong ngày',
      icon: TrendingUp,
    },
    {
      label: 'Chờ thanh toán',
      value: formatCurrency(data.summary.pendingRevenue),
      hint: `${data.summary.pendingOrders} đơn đang chờ`,
      icon: Clock3,
    },
    {
      label: 'Giá trị đơn TB',
      value: formatCurrency(data.summary.averageOrderValue),
      hint: 'Trên đơn đã thanh toán',
      icon: CreditCard,
    },
    {
      label: 'Tỉ lệ thanh toán',
      value: `${data.summary.conversionRate}%`,
      hint: `${data.summary.cancelledOrders} đơn đã hủy`,
      icon: CheckCircle2,
    },
  ] : [];

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-admin-primary" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-admin-text-muted">Đang tải dashboard doanh thu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="admin-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Dashboard</p>
          <h1 className="mt-1 text-2xl font-black text-admin-text">Thống kê doanh thu</h1>
          <p className="mt-1 text-sm text-admin-text-muted">
            Theo dõi doanh thu gói Premium, đơn chờ thanh toán và xu hướng 14 ngày gần nhất.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchRevenue('refresh')}
            disabled={refreshing}
            className="admin-btn admin-btn-secondary"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Làm mới
          </button>
          <Link href="/admin/transactions" className="admin-btn admin-btn-primary">
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
            Giao dịch
          </Link>
        </div>
      </header>

      {error && (
        <div className="admin-card flex items-start gap-3 border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-black">Không tải được dữ liệu</p>
            <p className="text-sm font-semibold">{error}</p>
          </div>
        </div>
      )}

      {data && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="admin-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-admin-text-muted">{stat.label}</p>
                      <p className="mt-2 break-words text-2xl font-black text-admin-text">{stat.value}</p>
                      <p className="mt-1 text-sm font-bold text-admin-text-muted">{stat.hint}</p>
                    </div>
                    <div className="admin-stat-icon flex-shrink-0">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
            <div className="admin-card p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-admin-text">Doanh thu 14 ngày</h2>
                  <p className="text-sm font-semibold text-admin-text-muted">Chỉ tính đơn đã thanh toán</p>
                </div>
                <div className="admin-stat-icon">
                  <LineChart className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <div className="space-y-3">
                {data.dailyRevenue.map((point) => {
                  const width = maxDailyRevenue > 0 ? Math.max(8, Math.round((point.revenue / maxDailyRevenue) * 100)) : 0;
                  return (
                    <div key={point.date} className="grid grid-cols-[56px_1fr_112px] items-center gap-3 text-sm">
                      <span className="font-black text-admin-text-muted">{point.label}</span>
                      <div className="h-9 overflow-hidden rounded-lg bg-admin-surface-muted">
                        <div
                          className="flex h-full items-center justify-end rounded-lg px-2 text-xs font-black text-white shadow-admin-sm"
                          style={{
                            width: `${width}%`,
                            minWidth: point.revenue > 0 ? '44px' : '0',
                            backgroundImage: point.revenue > 0 ? 'var(--admin-gradient)' : undefined,
                          }}
                        >
                          {point.orders > 0 ? point.orders : ''}
                        </div>
                      </div>
                      <span className="text-right font-black text-admin-text">{formatCurrency(point.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-card p-5">
              <div className="mb-5">
                <h2 className="text-lg font-black text-admin-text">Cơ cấu theo gói</h2>
                <p className="text-sm font-semibold text-admin-text-muted">Tỉ trọng doanh thu đã thanh toán</p>
              </div>

              {data.planBreakdown.length === 0 ? (
                <div className="rounded-xl bg-admin-surface-muted p-6 text-center text-sm font-bold text-admin-text-muted">
                  Chưa có đơn thanh toán thành công.
                </div>
              ) : (
                <div className="space-y-4">
                  {data.planBreakdown.map((plan) => (
                    <div key={plan.planId}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-admin-text">{plan.label}</p>
                          <p className="text-xs font-bold text-admin-text-muted">{plan.orders} đơn</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-admin-text">{formatCurrency(plan.revenue)}</p>
                          <p className="text-xs font-bold text-admin-primary">{plan.percent}%</p>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-admin-surface-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(4, plan.percent)}%`, backgroundImage: 'var(--admin-gradient)' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="admin-card overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-admin-border p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-admin-text">Giao dịch thanh toán mới</h2>
                <p className="text-sm font-semibold text-admin-text-muted">
                  Cập nhật lúc {formatDateTime(data.generatedAt)}
                </p>
              </div>
              <Link href="/admin/transactions" className="admin-btn admin-btn-secondary">
                Xem tất cả
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-border bg-admin-surface-muted">
                    <th className="px-4 py-3 text-left font-black text-admin-text-muted">Mã đơn</th>
                    <th className="px-4 py-3 text-left font-black text-admin-text-muted">Gói</th>
                    <th className="px-4 py-3 text-right font-black text-admin-text-muted">Số tiền</th>
                    <th className="px-4 py-3 text-left font-black text-admin-text-muted">Thanh toán lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPaidTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center font-bold text-admin-text-muted">
                        Chưa có giao dịch đã thanh toán.
                      </td>
                    </tr>
                  ) : (
                    data.recentPaidTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-admin-border last:border-0">
                        <td className="px-4 py-3 font-mono font-black text-admin-primary">{transaction.orderCode}</td>
                        <td className="px-4 py-3 font-bold text-admin-text">{transaction.planLabel}</td>
                        <td className="px-4 py-3 text-right font-black text-admin-text">{formatCurrency(transaction.amount)}</td>
                        <td className="px-4 py-3 font-semibold text-admin-text-muted">{formatDateTime(transaction.paidAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
