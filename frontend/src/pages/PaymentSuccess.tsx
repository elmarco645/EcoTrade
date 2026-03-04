import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  
  const paymentStatus = searchParams.get('status');
  const txRef = searchParams.get('tx_ref');
  const mode = searchParams.get('mode');

  useEffect(() => {
    const verifyPayment = async () => {
      if (paymentStatus === 'successful' || paymentStatus === 'completed') {
        try {
          const res = await fetch(`/api/pay/verify?tx_ref=${txRef}&mode=${mode}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (res.ok) {
            setStatus('success');
          } else {
            setStatus('failed');
          }
        } catch (err) {
          console.error('Verification failed');
          setStatus('failed');
        }
      } else if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
        setStatus('failed');
      } else {
        setStatus('success'); 
      }
    };

    verifyPayment();
  }, [paymentStatus, txRef, mode]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="max-w-md space-y-8"
      >
        {status === 'loading' ? (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-600" />
            <h1 className="text-2xl font-bold">Verifying Payment...</h1>
            <p className="text-slate-500">Please wait while we confirm your transaction.</p>
          </div>
        ) : status === 'success' ? (
          <div className="space-y-6">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900">Payment Successful!</h1>
              <p className="text-slate-500">
                Your order has been placed and funds are now held in escrow. 
                The seller has been notified to start shipping.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-bold">Transaction Reference:</p>
              <p className="font-mono text-xs">{txRef}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/orders"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700"
              >
                View My Orders
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/marketplace"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 font-bold text-slate-600 transition-all hover:bg-slate-50"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-red-600">
              <XCircle className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900">Payment Failed</h1>
              <p className="text-slate-500">
                Something went wrong with your payment. Don't worry, your cart items are still reserved for a short while.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/cart"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700"
              >
                Try Again
                <ShoppingBag className="h-5 w-5" />
              </Link>
              <Link
                to="/marketplace"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 font-bold text-slate-600 transition-all hover:bg-slate-50"
              >
                Back to Marketplace
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
