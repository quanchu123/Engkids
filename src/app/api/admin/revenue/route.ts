import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminAuthUser } from '@/lib/api-auth';
import { SUBSCRIPTION_PLANS, type PlanId } from '@/lib/payment';

export const dynamic = 'force-dynamic';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const MAX_TRANSACTIONS = 10000;

interface TransactionRow {
  id: string;
  user_id: string | null;
  order_code: string | number;
  amount: number | null;
  plan_id: string | null;
  status: string | null;
  created_at: string;
  paid_at: string | null;
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

function getVietnamDateKey(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

function getVietnamDateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+07:00`);
}

function formatShortDate(dateKey: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
  }).format(getVietnamDateFromKey(dateKey));
}

function getRecentDateKeys(days: number): string[] {
  const today = getVietnamDateFromKey(getVietnamDateKey(new Date()));

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - 1 - index));
    return getVietnamDateKey(date);
  });
}

function getPlanLabel(planId: string | null): string {
  if (!planId) return 'Khac';
  const plan = SUBSCRIPTION_PLANS[planId as PlanId];
  return plan?.name || planId;
}

function toAmount(value: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminAuthUser(request);

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('id, user_id, order_code, amount, plan_id, status, created_at, paid_at')
      .order('created_at', { ascending: false })
      .limit(MAX_TRANSACTIONS);

    if (error) {
      console.error('Revenue stats query error:', error);
      return NextResponse.json({ error: 'Failed to fetch revenue stats' }, { status: 500 });
    }

    const transactions = (data || []) as TransactionRow[];
    const paidTransactions = transactions.filter((transaction) => transaction.status === 'PAID');
    const pendingTransactions = transactions.filter((transaction) => transaction.status === 'PENDING');
    const cancelledTransactions = transactions.filter((transaction) => transaction.status === 'CANCELLED');
    const todayKey = getVietnamDateKey(new Date());
    const monthKey = todayKey.slice(0, 7);

    const totalRevenue = paidTransactions.reduce((sum, transaction) => sum + toAmount(transaction.amount), 0);
    const todayRevenue = paidTransactions.reduce((sum, transaction) => {
      const revenueDate = getVietnamDateKey(transaction.paid_at || transaction.created_at);
      return revenueDate === todayKey ? sum + toAmount(transaction.amount) : sum;
    }, 0);
    const monthRevenue = paidTransactions.reduce((sum, transaction) => {
      const revenueDate = getVietnamDateKey(transaction.paid_at || transaction.created_at);
      return revenueDate.startsWith(monthKey) ? sum + toAmount(transaction.amount) : sum;
    }, 0);
    const pendingRevenue = pendingTransactions.reduce((sum, transaction) => sum + toAmount(transaction.amount), 0);

    const dateKeys = getRecentDateKeys(14);
    const dailyMap = new Map<string, DailyRevenuePoint>(
      dateKeys.map((dateKey) => [
        dateKey,
        {
          date: dateKey,
          label: formatShortDate(dateKey),
          revenue: 0,
          orders: 0,
        },
      ]),
    );

    const planMap = new Map<string, PlanRevenuePoint>();

    for (const transaction of paidTransactions) {
      const amount = toAmount(transaction.amount);
      const revenueDate = getVietnamDateKey(transaction.paid_at || transaction.created_at);
      const dailyPoint = dailyMap.get(revenueDate);

      if (dailyPoint) {
        dailyPoint.revenue += amount;
        dailyPoint.orders += 1;
      }

      const planId = transaction.plan_id || 'unknown';
      const planPoint = planMap.get(planId) || {
        planId,
        label: getPlanLabel(planId),
        revenue: 0,
        orders: 0,
        percent: 0,
      };

      planPoint.revenue += amount;
      planPoint.orders += 1;
      planMap.set(planId, planPoint);
    }

    const planBreakdown = Array.from(planMap.values())
      .map((plan) => ({
        ...plan,
        percent: totalRevenue > 0 ? Math.round((plan.revenue / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const recentPaidTransactions = paidTransactions.slice(0, 8).map((transaction) => ({
      id: transaction.id,
      orderCode: String(transaction.order_code),
      amount: toAmount(transaction.amount),
      planId: transaction.plan_id || 'unknown',
      planLabel: getPlanLabel(transaction.plan_id),
      paidAt: transaction.paid_at || transaction.created_at,
    }));

    const conversionRate = transactions.length > 0
      ? Math.round((paidTransactions.length / transactions.length) * 100)
      : 0;

    return NextResponse.json({
      summary: {
        totalRevenue,
        monthRevenue,
        todayRevenue,
        pendingRevenue,
        paidOrders: paidTransactions.length,
        pendingOrders: pendingTransactions.length,
        cancelledOrders: cancelledTransactions.length,
        averageOrderValue: paidTransactions.length > 0 ? Math.round(totalRevenue / paidTransactions.length) : 0,
        conversionRate,
      },
      dailyRevenue: Array.from(dailyMap.values()),
      planBreakdown,
      recentPaidTransactions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Revenue stats error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
