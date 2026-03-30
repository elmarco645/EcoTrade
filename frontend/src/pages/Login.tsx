import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function Login({ setUser }: readonly { readonly setUser: (user: any) => void }) {
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get('email') || '';
  });
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const siteKey = (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (siteKey && !captchaToken) {
      setError('Please complete the CAPTCHA');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Force reload to get the latest emailVerified status
      await firebaseUser.reload();

      // Check if email is verified as requested by user
      if (!firebaseUser.emailVerified) {
        // Sign out immediately
        await auth.signOut();
        // Redirect to verification screen
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      const token = await firebaseUser.getIdToken();
      localStorage.setItem('token', token);
      
      // Create a basic user object from Firebase Auth
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
        avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
        emailVerified: firebaseUser.emailVerified,
        username: firebaseUser.displayName?.toLowerCase().replaceAll(/\s/g, '') || firebaseUser.email?.split('@')[0],
        wallet_balance: 0,
        role: 'user'
      };

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      console.log('Error code:', err.code);
      console.log('Email:', email);
      
      if (err.code === 'auth/operation-not-allowed') {
        setError('Login method is not enabled. Please contact support or check Firebase Console.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Email or password is incorrect');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
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
            </div>
          )}
          <div className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
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

          {siteKey ? (
            <div className="flex justify-center py-2">
              <ReCAPTCHA
                sitekey={siteKey}
                onChange={(token) => setCaptchaToken(token)}
              />
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-600 border border-amber-100">
              reCAPTCHA is not configured. Please add VITE_RECAPTCHA_SITE_KEY to your environment variables.
            </div>
          )}

          <div className="flex justify-end">
            <Link to="/forgot-password" title="Forgot password" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Sign In'}
          </button>
        </form>

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
