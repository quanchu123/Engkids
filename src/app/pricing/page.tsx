'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FREEMIUM_DAILY_MINUTES, SUBSCRIPTION_PLANS } from '@/lib/payment';
import { Check, Star, Crown, Clock, Sparkles, Shield, X } from 'lucide-react';
import Link from 'next/link';

const PLAN_ORDER: (keyof typeof SUBSCRIPTION_PLANS)[] = ['1_month', '3_months', '6_months'];

const formatPrice = (value: number) => value.toLocaleString('vi-VN');

const FEATURES_FREE = [
  { text: 'Tất cả tính năng học tập', included: true },
  { text: 'Mini-games & trò chơi', included: true },
  { text: `Giới hạn ${FREEMIUM_DAILY_MINUTES} phút/ngày`, included: true, highlight: true },
  { text: 'Học không giới hạn', included: false },
];

const FEATURES_PREMIUM = [
  'Mở khóa tất cả bài học',
  'Mini-games không giới hạn',
  'Theo dõi tiến trình học tập',
  'Học không giới hạn thời gian',
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(planId);
      setError(null);

      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra. Vui lòng đăng nhập trước khi mua gói.');
      }

      // Redirect to PayOS checkout page directly, with fallback to local checkout page
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.push(`/checkout/${data.orderCode}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(message);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 py-12 md:py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-6">
            <Crown size={18} className="text-purple-400" />
            <span className="text-purple-300 text-sm font-medium">Nâng cấp Premium</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Mở khóa{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              trọn bộ tính năng
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Cho bé học tiếng Anh không giới hạn mỗi ngày với gói Premium.
          </p>
        </div>

        {error && (
          <div className="mb-8 max-w-2xl mx-auto p-4 bg-red-900/50 border border-red-500/50 rounded-xl text-red-200 text-center">
            {error}
          </div>
        )}

        {/* Freemium vs Premium comparison */}
        <div className="max-w-4xl mx-auto mb-12 md:mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free plan */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-gray-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Miễn phí</h3>
                  <p className="text-gray-500 text-sm">Freemium</p>
                </div>
              </div>

              <div className="text-3xl font-black text-white mb-6">
                0đ
                <span className="text-sm text-gray-500 font-medium ml-1">mãi mãi</span>
              </div>

              <ul className="space-y-3">
                {FEATURES_FREE.map((f, i) => (
                  <li key={i} className="flex items-center text-sm">
                    {f.included ? (
                      <Check className="text-green-500 mr-3 shrink-0" size={18} />
                    ) : (
                      <X className="text-gray-600 mr-3 shrink-0" size={18} />
                    )}
                    <span className={f.highlight ? 'text-amber-300 font-medium' : f.included ? 'text-gray-300' : 'text-gray-600 line-through'}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium plan */}
            <div className="bg-gradient-to-b from-purple-900/40 to-gray-900 border-2 border-purple-500/30 rounded-2xl p-6 md:p-8 relative">
              <div className="absolute -top-3 right-6">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles size={12} /> Khuyến nghị
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-600/30 rounded-xl flex items-center justify-center">
                  <Crown size={20} className="text-purple-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Premium</h3>
                  <p className="text-purple-400 text-sm">Gói 6 tháng · Không giới hạn</p>
                </div>
              </div>

              <div className="text-3xl font-black text-white">
                {SUBSCRIPTION_PLANS['6_months'].pricePerMonth.toLocaleString('vi-VN')}đ
                <span className="text-sm text-gray-500 font-medium ml-1">/tháng</span>
              </div>
              <p className="text-sm text-purple-300/80 mt-1 mb-6">
                Thanh toán {SUBSCRIPTION_PLANS['6_months'].price.toLocaleString('vi-VN')}đ cho 6 tháng
              </p>

              <ul className="space-y-3">
                {FEATURES_PREMIUM.map((text, i) => (
                  <li key={i} className="flex items-center text-sm">
                    <Check className="text-purple-400 mr-3 shrink-0" size={18} />
                    <span className="text-gray-200">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Chọn gói phù hợp</h2>
          <p className="text-gray-400">Thanh toán đơn giản qua chuyển khoản ngân hàng</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {PLAN_ORDER.map((planId) => {
            const plan = SUBSCRIPTION_PLANS[planId];
            const isPopular = planId === '6_months';
            const originalPrice = planId === '1_month' ? SUBSCRIPTION_PLANS['1_month'].compareAtPrice : undefined;

            // Calculate savings vs 1-month plan
            const monthlyRate1 = SUBSCRIPTION_PLANS['1_month'].price;
            const savings = Math.round(((monthlyRate1 - plan.pricePerMonth) / monthlyRate1) * 100);

            return (
              <div
                key={planId}
                className={`relative flex flex-col p-6 rounded-2xl transition-all hover:scale-[1.03] ${
                  isPopular
                    ? 'bg-gradient-to-b from-purple-900/40 to-gray-900 border-2 border-purple-500/30 shadow-xl shadow-purple-500/10'
                    : 'bg-gray-900 border border-gray-800'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                      <Star size={12} fill="currentColor" /> Khuyến nghị
                    </span>
                  </div>
                )}

                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                {originalPrice && (
                  <div className="mb-1 text-sm font-semibold text-gray-500 line-through">
                    {formatPrice(originalPrice)}đ
                  </div>
                )}
                {originalPrice ? (
                  <div className="mb-1 flex items-end gap-1 font-black text-4xl text-pink-400">
                    <span>{formatPrice(plan.price)}đ</span>
                    <span className="pb-1 text-sm font-semibold text-gray-300">/tháng</span>
                  </div>
                ) : (
                  <div className="mb-1 font-black text-3xl text-white">
                    {formatPrice(plan.price)}đ
                  </div>
                )}
                <p className="text-gray-500 text-sm mb-4">
                  {originalPrice ? `Giảm ${formatPrice(originalPrice - plan.price)}đ so với giá cũ` : `~${formatPrice(plan.pricePerMonth)}đ/tháng`}
                  {originalPrice && (
                    <span className="ml-2 text-green-400 font-semibold">Ưu đãi tháng đầu</span>
                  )}
                  {!originalPrice && savings > 0 && (
                    <span className="ml-1 text-green-400 font-semibold">(-{savings}%)</span>
                  )}
                </p>

                <div className="flex-grow" />

                <button
                  onClick={() => handleSubscribe(planId)}
                  disabled={!!loading}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    isPopular
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  } ${loading === planId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading === planId ? 'Đang tạo đơn hàng...' : 'Chọn gói này'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Payment info */}
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <div className="flex items-center justify-center gap-3 text-gray-500 text-sm">
            <Shield size={16} />
            <span>Thanh toán an toàn qua chuyển khoản ngân hàng BIDV</span>
          </div>
        </div>

        {/* Back button */}
        <div className="text-center mt-8">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
