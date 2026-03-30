import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Lock, Loader2, ShieldCheck, Eye, EyeOff, Github } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { signInWithEmailAndPassword, signInWithCustomToken, sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login({ setUser }: { setUser: (user: any) => void }) {
  const [identifier, setIdentifier] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [showSignupAction, setShowSignupAction] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { customToken, user } = event.data;
        if (customToken) {
          try {
            setLoading(true);
            await signInWithCustomToken(auth, customToken);
            setUser(user);
            navigate('/profile');
          } catch (err: any) {
            console.error('Custom token sign-in failed:', err);
            setError('OAuth sign-in failed. Please try again.');
          } finally {
            setLoading(false);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate, setUser]);

  const handleOAuth = async (provider: 'google' | 'github') => {
    try {
      const res = await fetch(`/api/auth/${provider}/url`);
      const { url } = await res.json();
      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch (err) {
      console.error(`${provider} OAuth error:`, err);
      setError(`Failed to start ${provider} login`);
    }
  };

  const siteKey = (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY;

  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError('No user found to resend verification.');
      return;
    }
    setResending(true);
    setResendSuccess('');
    setError('');
    try {
      await sendEmailVerification(user);
      setResendSuccess('Verification email sent again! Please check your inbox.');
      setShowResend(false);
    } catch (err: any) {
      console.error('Resend verification error:', err);
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (siteKey && !captchaToken) {
      setError('Please complete the CAPTCHA');
      return;
    }

    setLoading(true);
    setError('');
    setShowResend(false);
    setShowSignupAction(false);
    setResendSuccess('');

    try {
      let emailToUse = identifier;

      // If identifier is not an email, we might need to resolve it on the backend
      if (!identifier.includes('@')) {
        const resolveRes = await fetch(`/api/auth/resolve-email?identifier=${encodeURIComponent(identifier)}`);
        if (resolveRes.ok) {
          const resolveData = await resolveRes.json();
          emailToUse = resolveData.email;
        }
      }

      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      const firebaseUser = userCredential.user;

      // Check if email is verified as requested by user
      if (!firebaseUser.emailVerified) {
        setUnverifiedEmail(firebaseUser.email!);
        setShowResend(true);
        setError('Please verify your email first.');
        setLoading(false);
        return;
      }

      const token = await firebaseUser.getIdToken();

      // 2. Sync with our backend
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ captchaToken }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('avatar', data.user.avatar);
        setUser(data.user);
        navigate('/');
      } else {
        setError(data.error || data.message);
        if (data.showResend) {
          setShowResend(true);
          setUnverifiedEmail(data.email);
        }
        if (data.action === 'SIGNUP') {
          setShowSignupAction(true);
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('Account not found');
        setShowSignupAction(true);
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white text-2xl font-bold">
            E
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Welcome Back</h2>
          <p className="mt-2 text-slate-500">Sign in to continue your sustainable journey</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
              {error}
              {showResend && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="mt-2 block w-full rounded-lg bg-red-100 py-2 text-center text-xs font-bold text-red-700 transition-all hover:bg-red-200 disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              )}
              {showSignupAction && (
                <Link
                  to={`/register?email=${encodeURIComponent(identifier)}`}
                  className="mt-2 block w-full rounded-lg bg-blue-600 py-2 text-center text-xs font-bold text-white transition-all hover:bg-blue-700"
                >
                  Sign up for free
                </Link>
              )}
            </div>
          )}
          {resendSuccess && (
            <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-600">
              {resendSuccess}
            </div>
          )}
          <div className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email, Username or Phone"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" title="Forgot password" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Forgot password?
            </Link>
          </div>

          {siteKey ? (
            <div className="flex justify-center">
              <ReCAPTCHA
                sitekey={siteKey}
                onChange={(token) => setCaptchaToken(token)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              <ShieldCheck className="h-4 w-4" />
              <span>reCAPTCHA is in simulation mode (Site Key missing)</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-slate-500">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleOAuth('google')}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 transition-all hover:bg-slate-50"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4" />
            Google
          </button>
          <button
            onClick={() => handleOAuth('github')}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 transition-all hover:bg-slate-50"
          >
            <Github className="h-4 w-4" />
            GitHub
          </button>
        </div>

        <p className="text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
