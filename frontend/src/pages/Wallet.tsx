import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Wallet({ user }: { user: any }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceRes, txRes] = await Promise.all([
          fetch('/api/user/wallet', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          // We'll need a route for this, but for now let's mock or just fetch transactions
          fetch('/api/user/transactions', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
        ]);
        const balanceData = await balanceRes.json();
        const txData = await txRes.json();
        setBalance(balanceData.balance);
        setTransactions(txData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleConfirm = async (txId: number) => {
    try {
      const res = await fetch(`/api/transactions/${txId}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        // Refresh data
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">My Wallet</h1>
          <p className="text-slate-500">Manage your funds and escrow transactions.</p>
        </div>
        <button className="rounded-2xl bg-blue-600 px-8 py-3 font-bold text-white transition-all hover:bg-blue-700">
          Add Funds
        </button>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-12 text-white shadow-2xl">
        <div className="relative z-10 space-y-2">
          <p className="text-lg font-medium text-slate-400">Available Balance</p>
          <h2 className="text-6xl font-black tracking-tight">${balance.toFixed(2)}</h2>
        </div>
        <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-10">
          <WalletIcon size={180} />
        </div>
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
      </div>

      {/* Transactions */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold">Recent Transactions</h3>
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
              No transactions yet.
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    tx.buyer_id === user.id ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {tx.buyer_id === user.id ? <ArrowUpRight /> : <ArrowDownLeft />}
                  </div>
                  <div>
                    <p className="font-bold">{tx.listing_title || 'Marketplace Purchase'}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(tx.created_at).toLocaleDateString()}
                      <span className="mx-1">•</span>
                      <span className={`font-medium ${
                        tx.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {tx.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <p className={`text-xl font-black ${
                    tx.buyer_id === user.id ? 'text-slate-900' : 'text-emerald-600'
                  }`}>
                    {tx.buyer_id === user.id ? '-' : '+'}${tx.amount}
                  </p>
                  {tx.status === 'paid' && tx.buyer_id === user.id && (
                    <button
                      onClick={() => handleConfirm(tx.id)}
                      className="flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1 text-xs font-bold text-white transition-all hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Confirm Receipt
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Escrow Info */}
      <div className="rounded-3xl bg-blue-50 p-8 border border-blue-100">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900">How Escrow Works</h4>
            <p className="mt-2 text-sm text-blue-700 leading-relaxed">
              When you buy an item, your payment is held securely by EcoTrade. We only release the funds to the seller once you confirm that you've received the item and it matches the description. This protects both buyers and sellers from fraud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
