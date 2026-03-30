import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../firebase';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>(oobCode ? 'loading' : 'pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!oobCode) {
      if (email) {
        setStatus('pending');
        setMessage(`We have sent you a verification email to ${email}. Please verify it and log in.`);
      } else {
        setStatus('error');
        setMessage('Verification code is missing.');
      }
      return;
    }

    const verify = async () => {
      try {
        await applyActionCode(auth, oobCode);
        setStatus('success');
        setMessage('Email verified successfully! You can now log in.');
      } catch (err: any) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('Verification failed or link expired. Please request a new one.');
      }
    };

    verify();
  }, [oobCode, email]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 rounded-[2.5rem] bg-white p-10 shadow-xl border border-slate-100 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Mail className="h-8 w-8" />
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Verifying your email...</h2>
            <p className="text-slate-500">Please wait while we confirm your email address.</p>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {status === 'pending' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Check your inbox</h2>
              <p className="text-slate-500">{message}</p>
            </div>
            <Link
              to="/login"
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-700"
            >
              Login
            </Link>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Email Verified!</h2>
              <p className="text-slate-500">{message}</p>
            </div>
            <Link
              to="/login"
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white transition-all hover:bg-blue-700"
            >
              Sign In Now
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <XCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Verification Failed</h2>
              <p className="text-slate-500">{message}</p>
            </div>
            <Link
              to="/register"
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-900 transition-all hover:bg-slate-200"
            >
              Back to Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
