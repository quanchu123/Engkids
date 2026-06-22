'use client';

import React from 'react';
import { useFreemium } from '@/hooks/useFreemium';
import { Clock, Crown, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FreemiumGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps learning pages. For freemium users it shows a countdown timer
 * and blocks access with an upgrade overlay when the daily limit expires.
 * Premium users see no restrictions.
 */
export default function FreemiumGuard({ children }: FreemiumGuardProps) {
  const { loading, isPremium, remainingSeconds, remainingFormatted, isExpired, dailyLimitMinutes } = useFreemium();

  // Don't block while loading premium status
  if (loading) return <>{children}</>;

  // Premium users pass through
  if (isPremium) return <>{children}</>;

  // Expired overlay
  if (isExpired) {
    return (
      <div className="relative min-h-screen">
        {/* Blurred content behind */}
        <div className="filter blur-sm pointer-events-none opacity-30 select-none">
          {children}
        </div>

        {/* Upgrade overlay */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-purple-500/30 rounded-3xl p-8 md:p-12 max-w-lg w-full text-center shadow-2xl shadow-purple-500/10 animate-fade-in">
            <div className="mx-auto w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
              <Crown className="text-purple-400" size={40} />
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Đã hết thời gian học miễn phí!
            </h2>

            <p className="text-gray-400 mb-2">
              Bạn đã sử dụng hết <strong className="text-white">{dailyLimitMinutes} phút</strong> miễn phí hôm nay.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Nâng cấp Premium để học không giới hạn mỗi ngày!
            </p>

            <div className="space-y-4">
              <Link
                href="/pricing"
                className="flex items-center justify-center w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-purple-500/25 gap-2"
              >
                <Sparkles size={20} />
                Nâng cấp Premium
                <ArrowRight size={20} />
              </Link>

              <Link
                href="/"
                className="block w-full py-3 text-gray-400 hover:text-gray-300 text-sm transition-colors"
              >
                Quay lại trang chủ
              </Link>
            </div>

            <p className="text-gray-600 text-xs mt-6">
              Thời gian miễn phí sẽ được đặt lại vào 0:00 ngày mai.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active freemium with time remaining — show timer badge
  const isLow = remainingSeconds <= 5 * 60; // ≤ 5 minutes
  const isUrgent = remainingSeconds <= 2 * 60; // ≤ 2 minutes

  return (
    <>
      {children}

      {/* Floating timer badge */}
      <div
        className={`fixed top-4 right-4 z-40 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-semibold transition-all
          ${isUrgent
            ? 'bg-red-600/90 text-white animate-pulse border border-red-400'
            : isLow
              ? 'bg-amber-600/90 text-white border border-amber-400'
              : 'bg-gray-800/90 text-gray-200 border border-gray-600'
          }
          backdrop-blur-sm
        `}
      >
        <Clock size={16} />
        <span>{remainingFormatted}</span>
        {isLow && (
          <Link
            href="/pricing"
            className="ml-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full text-xs transition-colors"
          >
            Nâng cấp
          </Link>
        )}
      </div>
    </>
  );
}
