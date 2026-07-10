'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { authFetch } from '@/lib/admin-auth-client';
import { formatVietnamShortDateTime } from '@/lib/vietnam-time';

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
  return formatVietnamShortDateTime(value);
}

const DAILY_CHART_WIDTH = 760;
const DAILY_CHART_HEIGHT = 260;
const DAILY_CHART_PADDING = {
  top: 20,
  right: 20,
  bottom: 42,
  left: 56,
};

interface DailyRevenueChartProps {
  points: DailyRevenuePoint[];
  formatCurrency: (value: number) => string;
}

function DailyRevenueChart({ points, formatCurrency }: DailyRevenueChartProps) {
  const chart = useMemo(() => {
    const maxRevenue = Math.max(1, ...points.map((point) => point.revenue));
    const totalRevenue = points.reduce((sum, point) => sum + point.revenue, 0);
    const averageRevenue = points.length > 0 ? totalRevenue / points.length : 0;
    const peakPoint = points.reduce<DailyRevenuePoint | null>((peak, point) => {
      if (!peak || point.revenue > peak.revenue) return point;
      return peak;
    }, null);

    const innerWidth = DAILY_CHART_WIDTH - DAILY_CHART_PADDING.left - DAILY_CHART_PADDING.right;
    const innerHeight = DAILY_CHART_HEIGHT - DAILY_CHART_PADDING.top - DAILY_CHART_PADDING.bottom;
    const chartBottom = DAILY_CHART_HEIGHT - DAILY_CHART_PADDING.bottom;

    const scaledPoints = points.map((point, index) => {
      const x = points.length === 1
        ? DAILY_CHART_PADDING.left + innerWidth / 2
        : DAILY_CHART_PADDING.left + (index / (points.length - 1)) * innerWidth;
      const y = DAILY_CHART_PADDING.top + innerHeight - ((point.revenue / maxRevenue) * innerHeight);

      return { ...point, x, y };
    });

    const linePath = scaledPoints
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    const areaPath = scaledPoints.length > 0
      ? `${linePath} L ${scaledPoints[scaledPoints.length - 1].x} ${chartBottom} L ${scaledPoints[0].x} ${chartBottom} Z`
      : '';

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      value: maxRevenue * ratio,
      y: DAILY_CHART_PADDING.top + innerHeight - (innerHeight * ratio),
    }));

    return {
      averageRevenue,
      maxRevenue,
      peakPoint,
      scaledPoints,
      ticks,
      areaPath,
      linePath,
    };
  }, [points]);

  if (!points.length) {
    return (
      <div className="rounded-2xl border border-admin-border bg-admin-surface-muted p-8 text-center text-sm font-bold text-admin-text-muted">
        Chưa có dữ liệu để vẽ biểu đồ.
      </div>
    );
  }

  const activeDays = points.filter((point) => point.revenue > 0).length;

  return (
    <div className="rounded-2xl border border-admin-border bg-gradient-to-br from-white via-slate-50 to-white p-4 shadow-admin-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Xu hướng 14 ngày</p>
          <h3 className="mt-1 text-lg font-black text-admin-text">Đồ thị doanh thu theo ngày</h3>
          <p className="mt-1 text-sm font-semibold text-admin-text-muted">
            Nhìn nhanh ngày đỉnh, doanh thu trung bình và số ngày có phát sinh giao dịch.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-admin-surface-muted px-3 py-2">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-admin-text-muted">Đỉnh</p>
            <p className="mt-1 text-sm font-black text-admin-text">{chart.peakPoint ? chart.peakPoint.label : '--'}</p>
            <p className="text-xs font-bold text-admin-primary">{chart.peakPoint ? formatCurrency(chart.peakPoint.revenue) : '0đ'}</p>
          </div>
          <div className="rounded-xl bg-admin-surface-muted px-3 py-2">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-admin-text-muted">TB/ngày</p>
            <p className="mt-1 text-sm font-black text-admin-text">{formatCurrency(Math.round(chart.averageRevenue))}</p>
            <p className="text-xs font-bold text-admin-primary">{points.length} ngày</p>
          </div>
          <div className="col-span-2 rounded-xl bg-admin-surface-muted px-3 py-2 sm:col-span-1">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-admin-text-muted">Ngày có doanh thu</p>
            <p className="mt-1 text-sm font-black text-admin-text">{activeDays}/{points.length}</p>
            <p className="text-xs font-bold text-admin-primary">Tổng đỉnh {formatCurrency(chart.maxRevenue)}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-admin-border bg-white">
        <svg
          viewBox={`0 0 ${DAILY_CHART_WIDTH} ${DAILY_CHART_HEIGHT}`}
          role="img"
          aria-label="Biểu đồ doanh thu 14 ngày"
          className="block h-[260px] w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="daily-revenue-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--admin-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--admin-primary)" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="daily-revenue-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--admin-primary)" />
              <stop offset="100%" stopColor="var(--admin-accent)" />
            </linearGradient>
          </defs>

          {chart.ticks.map((tick) => (
            <g key={`tick-${tick.y}`}>
              <line
                x1={DAILY_CHART_PADDING.left}
                x2={DAILY_CHART_WIDTH - DAILY_CHART_PADDING.right}
                y1={tick.y}
                y2={tick.y}
                stroke="rgba(148, 163, 184, 0.18)"
                strokeDasharray="4 4"
              />
              <text
                x={DAILY_CHART_PADDING.left - 12}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[11px] font-black"
              >
                {formatCurrency(Math.round(tick.value))}
              </text>
            </g>
          ))}

          <path d={chart.areaPath} fill="url(#daily-revenue-area)" />
          <path
            d={chart.linePath}
            fill="none"
            stroke="url(#daily-revenue-line)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {chart.scaledPoints.map((point) => (
            <g key={point.date}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="white"
                stroke="var(--admin-primary)"
                strokeWidth="3"
              />
              <text
                x={point.x}
                y={DAILY_CHART_HEIGHT - 14}
                textAnchor="middle"
                className="fill-slate-500 text-[11px] font-bold"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await authFetch('/api/admin/revenue', { cache: 'no-store' });
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
  }, []);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchRevenue('refresh');
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [fetchRevenue]);

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
            Dữ liệu thật từ giao dịch PayOS đã ghi nhận, tự cập nhật mỗi 30 giây.
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

              <DailyRevenueChart points={data.dailyRevenue} formatCurrency={formatCurrency} />

              <div className="mt-5 space-y-3">
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
