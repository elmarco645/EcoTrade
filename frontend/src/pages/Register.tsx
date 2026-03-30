import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, AtSign, Loader2, Eye, EyeOff, Check, X, Phone, Image } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase';

export default function Register({ setUser }: { setUser: (user: any) => void }) {
  const [email, setEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('email') || '';
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showLoginInstead, setShowLoginInstead] = useState(false);
  const navigate = useNavigate();

  const siteKey = (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (siteKey && !captchaToken) {
      setError('Please complete the CAPTCHA');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    setShowLoginInstead(false);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Send verification email
      try {
        const actionCodeSettings = {
          url: `${window.location.origin}/verify-email`,
          handleCodeInApp: true,
        };
        await sendEmailVerification(firebaseUser, actionCodeSettings);
      } catch (emailErr: any) {
        console.error('Email verification error:', emailErr);
      }

      // 3. IMPORTANT: Sign out immediately as requested
      await auth.signOut();

      // 4. Redirect to verification screen
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Registration method is not enabled. Please contact support or check Firebase Console.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
        setShowLoginInstead(true);
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthColor = ['bg-slate-200', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][strength];
  const strengthText = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white text-2xl font-bold">
            E
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Create Account</h2>
          <p className="mt-2 text-slate-500">Join EcoTrade and start trading sustainably</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
              <p>{error}</p>
              {showLoginInstead && (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/login?email=${encodeURIComponent(email)}`)}
                    className="w-full rounded-lg bg-red-100 py-2 text-center text-xs font-bold text-red-700 transition-all hover:bg-red-200"
                  >
                    Login Instead
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/auth/forgot-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setSuccess('Password reset email sent! Please check your inbox.');
                          setError('');
                          setShowLoginInstead(false);
                        } else {
                          setError(data.error);
                        }
                      } catch (err) {
                        setError('Failed to send reset email.');
                      }
                    }}
                    className="w-full rounded-lg bg-white border border-red-200 py-2 text-center text-xs font-bold text-red-600 transition-all hover:bg-red-50"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-600">
              {success}
            </div>
          )}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
            
            {password && (
              <div className="space-y-2 px-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Password Strength: {strengthText}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${strengthColor}`}
                    style={{ width: `${(strength / 4) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className={`flex items-center gap-1.5 text-[10px] ${password.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {password.length >= 8 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    8+ characters
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] ${/[A-Z]/.test(password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {/[A-Z]/.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Uppercase
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] ${/[0-9]/.test(password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {/[0-9]/.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Number
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {/[^A-Za-z0-9]/.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Special char
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className={`h-14 w-full rounded-2xl border bg-slate-50 pl-12 pr-4 outline-none transition-all focus:bg-white focus:ring-4 ${
                  confirmPassword && password !== confirmPassword 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-50' 
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-50'
                }`}
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs font-medium text-red-500 ml-2">Passwords do not match</p>
            )}

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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
