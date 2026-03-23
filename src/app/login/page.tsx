'use client';

import LoginForm from '@/components/auth/LoginForm';
import Header from '@/components/layout/Header';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center px-6 pt-20">
        <div className="w-full max-w-md -mt-20">
          {/* Header */}
          <div className="text-center mb-2">
            <h1 className="text-4xl font-bold text-white mb-3">
              🎨 EngKids
            </h1>
            <p className="text-gray-400 text-lg">
              Learn English through fun videos and stories
            </p>
          </div>

          {/* Email/Password Login */}
          <LoginForm />

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-3">
            <Link
              href="/"
              className="block text-gray-400 hover:text-white text-sm transition"
            >
              ← Back to home
            </Link>
            <p className="text-xs text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
