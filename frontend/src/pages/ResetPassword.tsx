import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

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

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-xl border border-slate-100 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Invalid Link</h2>
          <p className="mt-2 text-slate-500">This password reset link is invalid or has expired.</p>
          <Link
            to="/forgot-password"
            className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-700"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Set New Password</h2>
          <p className="mt-2 text-slate-500">Your new password must be different from previous ones.</p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-emerald-800">Password Reset Successful!</p>
              <p className="mt-2 text-xs text-emerald-600">You can now sign in with your new password.</p>
            </div>
            <Link
              to="/login"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New Password"
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
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className={`h-14 w-full rounded-2xl border bg-slate-50 pl-12 pr-4 outline-none transition-all focus:bg-white focus:ring-4 ${
                    confirmPassword && password !== confirmPassword 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-50' 
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-50'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Reset Password'}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
