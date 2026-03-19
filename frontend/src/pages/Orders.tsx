import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, AlertCircle, Star, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Orders({ user }: { user: any }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'buying' | 'selling'>('buying');
  const [showReviewModal, setShowReviewModal] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const ratingLabels: Record<number, string> = {
    1: "Poor",
    2: "Bad",
    3: "Average",
    4: "Good",
    5: "Awesome"
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      fetchOrders();
    }
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: number, action: string, body: any = {}) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) fetchOrders();
    } catch (err) {
      console.error(`Failed to ${action} order`);
    }
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          transaction_id: showReviewModal.id,
          rating,
          review_text: comment
        })
      });
      if (res.ok) {
        setShowReviewModal(null);
        setRating(5);
        setComment('');
        fetchOrders();
      }
    } catch (err) {
      console.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    activeTab === 'buying' ? o.buyer_id === user?.id : o.seller_id === user?.id
  );

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-slate-500">Manage your purchases and sales.</p>
        </div>
        
        <div className="flex rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab('buying')}
            className={`rounded-xl px-6 py-2 text-sm font-bold transition-all ${
              activeTab === 'buying' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Buying
          </button>
          <button
            onClick={() => setActiveTab('selling')}
            className={`rounded-xl px-6 py-2 text-sm font-bold transition-all ${
              activeTab === 'selling' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Selling
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[2.5rem] border border-slate-100">
            <Package className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold">No orders found</h3>
            <p className="text-slate-500">You haven't {activeTab === 'buying' ? 'bought' : 'sold'} anything yet.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-col gap-6 p-6 md:flex-row">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                  <img 
                    src={JSON.parse(order.listing_images || '[]')[0] || `https://picsum.photos/seed/${order.listing_id}/200/200`} 
                    alt="" 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex flex-col justify-between gap-4 md:flex-row">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{order.listing_title}</h3>
                      <p className="text-sm text-slate-500">
                        {activeTab === 'buying' ? `Seller: ${order.seller_name}` : `Buyer: ${order.buyer_name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-blue-600">${order.total_amount.toFixed(2)}</p>
                      <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        order.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                        order.status === 'disputed' ? 'bg-red-100 text-red-600' :
                        order.status === 'pending_payment' ? 'bg-amber-100 text-amber-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-50 pt-4">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        Escrow: {order.escrow_status}
                      </div>
                      {order.tracking_id && (
                        <div className="flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5" />
                          Tracking: {order.tracking_id}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Seller Actions */}
                      {activeTab === 'selling' && order.status === 'paid' && (
                        <button 
                          onClick={() => {
                            const tid = prompt('Enter Tracking ID:');
                            if (tid) handleStatusUpdate(order.id, 'ship', { tracking_id: tid });
                          }}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                        >
                          Mark as Shipped
                        </button>
                      )}
                      {activeTab === 'selling' && order.status === 'shipped' && (
                        <button 
                          onClick={() => handleStatusUpdate(order.id, 'deliver')}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                        >
                          Mark as Delivered
                        </button>
                      )}

                      {/* Buyer Actions */}
                      {activeTab === 'buying' && order.status === 'pending_payment' && (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/pay', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify({
                                  amount: order.total_amount,
                                  transaction_ids: [order.id]
                                })
                              });
                              const data = await res.json();
                              if (data.status === 'success' && data.data.link) {
                                window.location.href = data.data.link;
                              }
                            } catch (err) {
                              console.error('Failed to initiate payment');
                            }
                          }}
                          className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                        >
                          Pay Now
                        </button>
                      )}
                      {activeTab === 'buying' && order.status === 'delivered' && (
                        <>
                          <button 
                            onClick={() => handleStatusUpdate(order.id, 'confirm')}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            Confirm Receipt
                          </button>
                          <button 
                            onClick={() => {
                              const reason = prompt('Enter Dispute Reason:');
                              if (reason) handleStatusUpdate(order.id, 'dispute', { reason, evidence: [] });
                            }}
                            className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                          >
                            Dispute
                          </button>
                        </>
                      )}
                      
                      {activeTab === 'buying' && order.status === 'completed' && (
                        <button 
                          onClick={() => setShowReviewModal(order)}
                          className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Rate Seller
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReviewModal(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white shadow-2xl"
            >
              <div className="bg-slate-50 p-8 pb-6 text-center">
                <h2 className="text-2xl font-bold">Rate your experience</h2>
                <p className="mt-1 text-sm text-slate-500">How was your transaction with {showReviewModal.seller_name}?</p>
              </div>

              <div className="p-8 pt-6 space-y-8">
                <div className="text-center space-y-3">
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button 
                        key={s} 
                        onClick={() => setRating(s)}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star className={`h-10 w-10 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                  <p className={`text-lg font-bold transition-colors ${rating >= 4 ? 'text-emerald-600' : rating >= 3 ? 'text-amber-600' : 'text-red-500'}`}>
                    {ratingLabels[rating]}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Review</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe your experience with this seller..."
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50/50"
                    rows={4}
                  />
                </div>
                
                <button
                  onClick={submitReview}
                  disabled={submittingReview || comment.length < 5}
                  className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 hover:shadow-blue-200 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
                >
                  {submittingReview ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Submit Review'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
