import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Lock, Loader2, ShieldCheck, Eye, EyeOff, Github, AlertCircle, CheckCircle2 } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { signInWithEmailAndPassword, signInWithCustomToken, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Login({ setUser }: { setUser: (user: any) => void }) {
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  });
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resending, setResending] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const navigate = useNavigate();

  const siteKey = (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY;

  const handleResendVerification = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    setResending(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(firebaseUser, actionCodeSettings);
      setSuccess('Verification email resent! Please check your inbox.');
      setUnverified(false);
      // Now we can sign out since the email is sent
      await signOut(auth);
    } catch (err: any) {
      console.error('Resend error:', err);
      setError('Failed to resend verification email. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUnverified(false);
    
    if (siteKey && !captchaToken) {
      setError('Please complete the CAPTCHA');
      return;
    }

    setLoading(true);
    setError('');

    console.log("Attempting login with:", { email: email.trim(), password: password ? '********' : 'EMPTY' });

    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;

      // Force reload to get the latest emailVerified status
      await firebaseUser.reload();

      // Check if email is verified as requested by user
      if (!firebaseUser.emailVerified) {
        setUnverified(true);
        setError('Your email is not verified. Please check your inbox or click below to resend.');
        setLoading(false);
        return;
      }

      const token = await firebaseUser.getIdToken();
      localStorage.setItem('token', token);
      
      // 2. Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        console.warn('[LOGIN] Firestore profile not found for UID:', firebaseUser.uid);
        // If profile doesn't exist, we might want to redirect to a "Complete Profile" page
        // For now, we'll create a basic one so the app doesn't crash
        const basicData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
          emailVerified: firebaseUser.emailVerified,
          username: firebaseUser.displayName?.toLowerCase().replace(/\s/g, '') || firebaseUser.email?.split('@')[0],
          wallet_balance: 0,
          role: 'buyer'
        };
        localStorage.setItem('user', JSON.stringify(basicData));
        setUser(basicData);
      } else {
        const dbUser = userDoc.data();
        const userData = {
          ...dbUser,
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
      
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Login method is not enabled. Please contact support or check Firebase Console.');
      } else if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential'
      ) {
        setError('Email or password is incorrect');
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
            <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-600">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="space-y-2">
                <p className="font-medium">{error}</p>
                {unverified && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="text-sm font-bold underline hover:text-red-700 disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-600">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="font-medium">{success}</p>
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
