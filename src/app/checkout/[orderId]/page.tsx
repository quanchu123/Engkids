'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutReturnPage({ params }: { params: { orderId: string } }) {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';
  const router = useRouter();

  const [count, setCount] = useState(5);

  useEffect(() => {
    if (isSuccess) {
      // Auto redirect after 5 seconds
      const timer = setInterval(() => {
        setCount((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isSuccess, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 p-8 md:p-12 rounded-3xl max-w-lg w-full text-center shadow-2xl">
        {isSuccess ? (
          <>
            <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="text-green-500" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Thanh toán thành công!</h1>
            <p className="text-gray-400 mb-8 text-lg">
              Tài khoản của bạn đã được nâng cấp lên hạng Premium. Cảm ơn bạn đã tin tưởng và đồng hành cùng EngKids!
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Sẽ tự động chuyển về trang chủ sau {count} giây...
            </p>
            <Link 
              href="/"
              className="inline-flex items-center justify-center w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              Bắt đầu học ngay <ArrowRight className="ml-2" size={20} />
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
              <XCircle className="text-red-500" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Thanh toán thất bại</h1>
            <p className="text-gray-400 mb-8 text-lg">
              Có vẻ như quá trình thanh toán đã bị hủy hoặc có lỗi xảy ra. Vui lòng thử lại.
            </p>
            <Link 
              href="/pricing"
              className="inline-flex items-center justify-center w-full py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all"
            >
              Quay lại Bảng giá
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
