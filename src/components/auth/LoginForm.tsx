'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signUp, getCurrentUser } from '@/lib/auth-client';
import { adminLogin, isAdminAuthenticated } from '@/lib/admin-auth-client';
import { authConfig } from '@/config/auth';

interface LoginFormProps {
  mode?: 'signin' | 'signup';
  onSuccess?: () => void;
}

export default function LoginForm({ mode = 'signin', onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [parentName, setParentName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [parentAge, setParentAge] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(mode === 'signup');
  const [info, setInfo] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to send a regular user after login. Honor ?next= but only for
  // same-site absolute paths (must start with a single "/"), so a crafted
  // ?next=//evil.com or ?next=https://evil.com can't turn this into an
  // open redirect. Anything else falls back to the dashboard.
  const nextParam = searchParams?.get('next') || '';
  const safeNext = /^\/(?!\/)/.test(nextParam) ? nextParam : authConfig.redirects.afterLogin;

  // Translate common Supabase auth errors to friendly Vietnamese messages.
  const translateError = (raw: string): string => {
    const m = raw.toLowerCase();
    if (m.includes('email not confirmed') || m.includes('not confirmed')) {
      return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư và bấm link xác nhận trước khi đăng nhập.';
    }
    if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
      return 'Email hoặc mật khẩu không đúng.';
    }
    if (m.includes('user already registered') || m.includes('already registered')) {
      return 'Email này đã được đăng ký. Hãy đăng nhập.';
    }
    if (m.includes('rate limit') || m.includes('too many')) {
      return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.';
    }
    if (m.includes('password') && m.includes('6')) {
      return 'Mật khẩu phải có ít nhất 6 ký tự.';
    }
    return raw;
  };

  useEffect(() => {
    let isMounted = true;

    // Verify token against server to avoid redirecting with expired cached token
    getCurrentUser().then((user) => {
      if (isMounted && user) {
        window.location.replace(safeNext);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [safeNext]);

  const saveSignupProfile = async () => {
    const response = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name,
        parentName,
        childAge,
        parentAge,
        gender,
        address,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error || 'Không lưu được thông tin tài khoản.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const redirectToUserDestination = () => {
        window.location.replace(safeNext);
      };

      const syncSignupProfile = async () => {
        try {
          await saveSignupProfile();
        } catch (profileError) {
          // The database trigger already creates the profile row. Treat this as
          // best-effort so a transient auth/cookie race does not block signup.
          console.warn('Signup profile sync failed:', profileError);
        }
      };

      if (isSignup) {
        if (password !== confirmPassword) {
          setError('Mật khẩu xác nhận không khớp.');
          setLoading(false);
          return;
        }

        const data = await signUp(email, password, {
          name,
          parentName,
          childAge,
          parentAge,
          gender,
          address
        });

        if (data?.user) {
          if (data.session) {
            await syncSignupProfile();
            redirectToUserDestination();
            return;
          }

          // Try to sign in manually if session is missing (in case of specific Supabase settings)
          try {
            await signIn(email, password);
            await syncSignupProfile();
            redirectToUserDestination();
            return;
          } catch (err) {
            // If it fails, it usually means email confirmation is required by Supabase
            setInfo('Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.');
            setIsSignup(false);
            setPassword('');
            setConfirmPassword('');
            return;
          }
        }
      } else {
        let supabaseSignInError: unknown = null;

        try {
          await signIn(email, password);
        } catch (err) {
          supabaseSignInError = err;
        }

        // Decide admin vs regular redirect using the server-side check
        // (/api/admin/me reads ADMIN_EMAILS on the server). This avoids relying
        // on NEXT_PUBLIC_ADMIN_EMAILS being present in the client bundle.
        let isAdmin = await isAdminAuthenticated();

        if (!isAdmin) {
          try {
            await adminLogin(email, password);
            isAdmin = true;
          } catch {
            if (supabaseSignInError) {
              throw supabaseSignInError;
            }
          }
        }

        if (isAdmin) {
          router.push('/admin');
          return;
        }

        redirectToUserDestination();
      }

      onSuccess?.();
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Authentication failed';
      setError(translateError(raw));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full ${isSignup ? 'max-w-2xl' : 'max-w-md'}`} data-testid="login-form">
      <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
        <h2 className="text-3xl font-bold text-white mb-2 text-center">
          {isSignup ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
        </h2>
        <p className="text-gray-400 text-center mb-8">
          {isSignup ? 'Đăng ký để bắt đầu học' : 'Đăng nhập để tiếp tục học'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignup ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Họ tên trẻ</label>
                  <input id="name" type="text" data-testid="signup-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Họ tên trẻ" className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="childAge" className="block text-sm font-medium text-gray-300 mb-2">Tuổi của trẻ</label>
                  <select id="childAge" required value={childAge} onChange={(e) => setChildAge(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                    <option value="">Chọn tuổi</option>
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(age => (
                      <option key={age} value={age}>{age} tuổi</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="parentName" className="block text-sm font-medium text-gray-300 mb-2">Họ tên Bố mẹ</label>
                  <input id="parentName" type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Họ tên Bố mẹ" className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="parentAge" className="block text-sm font-medium text-gray-300 mb-2">Tuổi của Bố mẹ</label>
                  <select id="parentAge" value={parentAge} onChange={(e) => setParentAge(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                    <option value="">Chọn tuổi</option>
                    {Array.from({ length: 83 }, (_, i) => i + 18).map(age => (
                      <option key={age} value={age}>{age} tuổi</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input id="email" type="email" data-testid="login-email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                </div>
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-300 mb-2">Giới tính</label>
                  <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition">
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">Địa chỉ</label>
                <input id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Địa chỉ hiện tại" className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Mật khẩu</label>
                  <input id="password" type="password" data-testid="login-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="........" minLength={6} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Xác nhận mật khẩu</label>
                  <input id="confirmPassword" type="password" data-testid="signup-confirm-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="........" minLength={6} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input id="email" type="email" data-testid="login-email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Mật khẩu</label>
                <input id="password" type="password" data-testid="login-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="........" minLength={6} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition" />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {info && (
            <div className="bg-green-900/30 border border-green-500 text-green-300 px-4 py-3 rounded-lg text-sm">
              {info}
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
                {isSignup ? 'Đang tạo tài khoản...' : 'Đang đăng nhập...'}
              </span>
            ) : (
              <span>{isSignup ? 'Đăng ký' : 'Đăng nhập'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
              setInfo('');
            }}
            data-testid="login-mode-toggle"
            className="text-purple-400 hover:text-purple-300 text-sm transition"
          >
            {isSignup ? 'Đã có tài khoản? Đăng nhập' : "Chưa có tài khoản? Đăng ký"}
          </button>
        </div>
      </div>
    </div>
  );
}
