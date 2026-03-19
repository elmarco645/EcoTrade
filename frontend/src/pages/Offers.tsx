import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Check, X, Loader2, Package, ArrowRight, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Offers({ user }: { user: any }) {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      fetchOffers();
    }
  }, [user, navigate]);

  const fetchOffers = async () => {
    try {
      const res = await fetch('/api/offers', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setOffers(data);
    } catch (err) {
      console.error('Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferAction = async (offerId: number, action: string) => {
    try {
      const res = await fetch(`/api/offers/${offerId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) fetchOffers();
    } catch (err) {
      console.error(`Failed to ${action} offer`);
    }
  };

  const filteredOffers = offers.filter(o => 
    activeTab === 'received' ? o.seller_id === user?.id : o.buyer_id === user?.id
  );

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Negotiations</h1>
          <p className="text-slate-500">Manage your active offers and counter-offers.</p>
        </div>
        
        <div className="flex rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab('received')}
            className={`rounded-xl px-6 py-2 text-sm font-bold transition-all ${
              activeTab === 'received' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`rounded-xl px-6 py-2 text-sm font-bold transition-all ${
              activeTab === 'sent' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sent
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-[2.5rem] border border-slate-100">
            <Tag className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-bold">No offers found</h3>
            <p className="text-slate-500">You haven't {activeTab === 'received' ? 'received' : 'sent'} any offers yet.</p>
          </div>
        ) : (
          filteredOffers.map(offer => (
            <div key={offer.id} className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      offer.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' :
                      offer.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {offer.status}
                    </span>
                    <span className="text-xs text-slate-400">Expires {new Date(offer.expires_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{offer.listing_title}</h3>
                  <p className="text-sm text-slate-500">
                    {activeTab === 'received' ? `From: ${offer.buyer_name}` : `To: Seller`}
                  </p>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-400">Offer Amount</p>
                    <p className="text-2xl font-black text-blue-600">${offer.amount}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    {activeTab === 'received' && offer.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleOfferAction(offer.id, 'accept')}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleOfferAction(offer.id, 'reject')}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    {activeTab === 'sent' && offer.status === 'accepted' && (
                      <button 
                        onClick={() => navigate(`/listing/${offer.listing_id}`)}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        Checkout Now
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button 
                      onClick={() => navigate(`/chat?listingId=${offer.listing_id}&sellerId=${offer.seller_id}`)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-blue-500 hover:text-blue-600"
                    >
                      <MessageSquare className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
