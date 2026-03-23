import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function UndoDelete() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing restoration token.');
      return;
    }

    const restoreAccount = async () => {
      try {
        const res = await fetch(`/api/user/undo-delete?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to restore account.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('A network error occurred. Please try again.');
      }
    };

    restoreAccount();
  }, [token]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-[3rem] bg-white p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className={`rounded-[2rem] p-6 shadow-xl ${
            status === 'loading' ? 'bg-blue-50 text-blue-600' :
            status === 'success' ? 'bg-emerald-50 text-emerald-600' :
            'bg-red-50 text-red-600'
          }`}>
            {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-12 w-12" />}
            {status === 'error' && <XCircle className="h-12 w-12" />}
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-black text-slate-900 tracking-tight">
          {status === 'loading' && 'Restoring Account...'}
          {status === 'success' && 'Account Restored!'}
          {status === 'error' && 'Restoration Failed'}
        </h1>

        <p className="mb-10 text-lg font-medium text-slate-500 leading-relaxed">
          {message || 'Please wait while we process your request.'}
        </p>

        <div className="space-y-4">
          {status === 'success' && (
            <Link 
              to="/login"
              className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 font-black text-white shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
            >
              Go to Login
            </Link>
          )}

          {(status === 'error' || status === 'loading') && (
            <Link 
              to="/"
              className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 font-black text-slate-600 hover:bg-slate-200 transition-all"
            >
              <ArrowLeft size={20} />
              Back to Home
            </Link>
          )}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          <ShieldCheck size={14} />
          EcoTrade Secure Recovery
        </div>
      </motion.div>
    </div>
  );
}
