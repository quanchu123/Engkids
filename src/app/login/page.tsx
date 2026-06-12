'use client';

import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import Header from '@/components/layout/Header';

export default function LoginPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center px-6 pt-20">
        <div className="w-full flex flex-col items-center -mt-20">
          <div className="text-center mb-2">
            <h1 className="text-4xl font-bold text-white mb-3">EngKids</h1>
            <p className="text-gray-400 text-lg">Học tiếng Anh qua video và truyện tranh vui nhộn</p>
          </div>

          <LoginForm />

          <div className="mt-8 text-center space-y-3">
            <Link href="/" className="block text-gray-400 hover:text-white text-sm transition">
              Về trang chủ
            </Link>
            <p className="text-xs text-gray-500">
              Bằng cách đăng nhập, bạn đồng ý với Điều khoản và Thỏa thuận của chúng tôi
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
