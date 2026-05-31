'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp, getSupabaseClient } from '@/lib/auth-client';
import { resolveSupabaseAdminUser } from '@/lib/admin-access';
import { authConfig } from '@/config/auth';

interface LoginFormProps {
  mode?: 'signin' | 'signup';
  onSuccess?: () => void;
}

export default function LoginForm({ mode = 'signin', onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(mode === 'signup');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signUp(email, password, name);
        router.push(authConfig.redirects.afterSignup);
      } else {
        await signIn(email, password);

        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const adminUser = await resolveSupabaseAdminUser(supabase, user);
          if (adminUser) {
            router.push('/admin');
            return;
          }

          router.push('/progress');
        }
      }

      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md" data-testid="login-form">
      <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-gray-400 text-center mb-8">
          {isSignup ? 'Sign up to start learning' : 'Sign in to continue learning'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignup && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                data-testid="signup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              data-testid="login-email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              data-testid="login-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="........"
              minLength={6}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
            {isSignup && (
              <p className="text-xs text-gray-500 mt-2">At least 6 characters</p>
            )}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            data-testid="login-submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {isSignup ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (
              <span>{isSignup ? 'Sign Up' : 'Sign In'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
            }}
            data-testid="login-mode-toggle"
            className="text-purple-400 hover:text-purple-300 text-sm transition"
          >
            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
