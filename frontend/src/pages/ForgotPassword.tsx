import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Forgot Password?</h2>
          <p className="mt-2 text-slate-500">No worries, we'll send you reset instructions.</p>
        </div>

        {message ? (
          <div className="space-y-6">
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-emerald-800">{message}</p>
              <p className="mt-2 text-xs text-emerald-600">Check your server console for the simulation link.</p>
            </div>
            <Link
              to="/login"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 text-lg font-bold text-slate-900 transition-all hover:bg-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Send Reset Link'}
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
