'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS } from '@/lib/payos';
import { Check, Star } from 'lucide-react';

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
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Redirect to the checkout URL provided by PayOS
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra. Vui lòng đăng nhập trước khi mua gói.');
      setLoading(null);
    }
  };

  const plans = Object.values(SUBSCRIPTION_PLANS);

  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-4xl font-extrabold text-white mb-4">Nâng cấp tài khoản Premium</h1>
        <p className="text-xl text-gray-400 mb-12">Mở khóa toàn bộ tính năng, bài học, và trò chơi trí tuệ cho bé.</p>

        {error && (
          <div className="mb-8 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 inline-block">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const isPopular = plan.id === '6_months';
            
            return (
              <div 
                key={plan.id}
                className={`relative flex flex-col p-8 rounded-3xl transition-transform hover:scale-105 ${
                  isPopular 
                    ? 'bg-gradient-to-b from-purple-900 to-gray-900 border-2 border-purple-500 shadow-2xl shadow-purple-500/20' 
                    : 'bg-gray-900 border border-gray-800'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold px-4 py-1.5 rounded-full flex items-center gap-1">
                      <Star size={16} fill="currentColor" /> Phổ biến nhất
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="text-4xl font-black text-white mb-6">
                  {plan.price.toLocaleString('vi-VN')}đ
                  <span className="text-lg text-gray-500 font-medium">/{plan.durationMonths}tháng</span>
                </div>

                <ul className="space-y-4 mb-8 text-left flex-grow">
                  <li className="flex items-center text-gray-300">
                    <Check className="text-green-500 mr-3 shrink-0" size={20} />
                    Mở khóa tất cả bài học
                  </li>
                  <li className="flex items-center text-gray-300">
                    <Check className="text-green-500 mr-3 shrink-0" size={20} />
                    Theo dõi tiến trình học tập
                  </li>
                  <li className="flex items-center text-gray-300">
                    <Check className="text-green-500 mr-3 shrink-0" size={20} />
                    Mini-games không giới hạn
                  </li>
                  {plan.durationMonths >= 6 && (
                    <li className="flex items-center text-gray-300">
                      <Check className="text-purple-400 mr-3 shrink-0" size={20} />
                      <span className="font-semibold text-purple-200">Tiết kiệm chi phí hơn</span>
                    </li>
                  )}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!loading}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    isPopular
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading === plan.id ? 'Đang tạo hóa đơn...' : 'Đăng ký ngay'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
