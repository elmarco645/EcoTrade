import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, ShieldCheck, MessageSquare, ShoppingCart, Star, ArrowLeft, Loader2, Tag, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { getImages } from '../lib/imageUtils';

export default function ListingDetail({ user, addToCart }: { user: any, addToCart: (item: any) => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offering, setOffering] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then(res => res.json())
      .then(data => {
        setListing(data);
        setLoading(false);
        if (data.seller_id) {
          fetch(`/api/sellers/${data.seller_id}/reviews`)
            .then(res => res.json())
            .then(setReviews);
        }
      });
  }, [id]);

  const handleBuy = async () => {
    if (!user) return navigate('/login');
    setBuying(true);
    setError('');

    try {
      const res = await fetch('/api/transactions/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ listing_id: id })
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/wallet');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Transaction failed. Please try again.');
    } finally {
      setBuying(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!user) return navigate('/login');
    if (!offerAmount || isNaN(Number(offerAmount))) return;
    setOffering(true);
    setError('');

    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ listing_id: id, amount: Number(offerAmount) })
      });
      if (res.ok) {
        setShowOfferModal(false);
        setOfferAmount('');
        // Maybe show a success toast
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to send offer.');
    } finally {
      setOffering(false);
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;
  if (!listing) return <div className="text-center">Listing not found.</div>;

  const images = getImages(listing.images);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600">
        <ArrowLeft className="h-4 w-4" /> Back to Marketplace
      </button>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-[3rem] bg-white shadow-sm">
            <img
              src={images[0] || `https://picsum.photos/seed/${listing.id}/800/800`}
              alt={listing.title}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {images.slice(1).map((img: string, i: number) => (
              <div key={i} className="aspect-square overflow-hidden rounded-2xl bg-white shadow-sm">
                <img src={img} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600 uppercase tracking-wider">
                {listing.category}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 uppercase tracking-wider">
                {listing.condition}
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{listing.title}</h1>
            <div className="flex items-center gap-4 text-slate-500">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {listing.location}
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                <span className="font-bold text-slate-900">{listing.seller_rating ? listing.seller_rating.toFixed(1) : 'New'}</span>
                <span className="text-xs">({listing.seller_reviews_count || 0} reviews)</span>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-8 shadow-sm border border-slate-100">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Price</p>
                <p className="text-4xl font-black text-blue-600">${listing.price}</p>
              </div>
              {listing.is_negotiable === 1 && (
                <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Negotiable</span>
              )}
            </div>

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-4">
              {listing.status !== 'available' && (
                <div className="w-full rounded-2xl bg-amber-50 p-4 text-amber-800 border border-amber-100 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <p className="font-bold uppercase text-[10px] tracking-widest">Status: {listing.status}</p>
                    <p className="text-sm">This item is currently {listing.status}. It may become available again if the current transaction is not completed.</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleBuy}
                disabled={buying || listing.status !== 'available'}
                className="flex flex-1 min-w-[150px] items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {buying ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Buy Now
                  </>
                )}
              </button>
              {listing.is_negotiable === 1 && (
                <button
                  onClick={() => setShowOfferModal(true)}
                  disabled={listing.status !== 'available'}
                  className="flex flex-1 min-w-[150px] items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-white py-4 text-lg font-bold text-emerald-600 transition-all hover:bg-emerald-50 disabled:opacity-50"
                >
                  <Tag className="h-5 w-5" />
                  Make Offer
                </button>
              )}
              <button
                onClick={() => {
                  addToCart(listing);
                  navigate('/cart');
                }}
                disabled={listing.status !== 'available'}
                className="flex flex-1 min-w-[150px] items-center justify-center gap-2 rounded-2xl border-2 border-blue-600 bg-white py-4 text-lg font-bold text-blue-600 transition-all hover:bg-blue-50 disabled:opacity-50"
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </button>
              <button 
                onClick={() => navigate(`/chat?listingId=${listing.id}&sellerId=${listing.seller_id}`)}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-600 transition-all hover:border-blue-500 hover:text-blue-600"
              >
                <MessageSquare className="h-5 w-5" />
                Chat
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Secure Escrow: Money is held safely until you confirm receipt.
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">Description</h3>
            <p className="leading-relaxed text-slate-600">
              {listing.description}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Seller Reviews</h3>
              {listing.seller_rating && (
                <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                  <Star className="h-4 w-4 fill-amber-500" />
                  {listing.seller_rating.toFixed(1)} Average
                </div>
              )}
            </div>
            
            {reviews.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">
                No reviews yet for this seller.
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-blue-600">
                          {review.buyer_name?.[0]}
                        </div>
                        <span className="text-sm font-bold">{review.buyer_name}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 italic">"{review.review_text}"</p>
                    <p className="mt-2 text-[10px] text-slate-400 uppercase tracking-widest">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {reviews.length > 3 && (
                  <button className="w-full rounded-xl bg-slate-50 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100">
                    View all {reviews.length} reviews
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-slate-100 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-bold text-blue-600">
              {listing.seller_name?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold">{listing.seller_name}</p>
                {listing.is_seller_verified === 1 && (
                  <ShieldCheck className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                )}
              </div>
              <p className="text-sm text-slate-500">Seller since 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      <AnimatePresence>
        {showOfferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOfferModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-2xl"
            >
              <button 
                onClick={() => setShowOfferModal(false)}
                className="absolute right-6 top-6 rounded-full p-2 hover:bg-slate-100"
              >
                <X className="h-6 w-6" />
              </button>
              
              <h2 className="mb-2 text-2xl font-bold">Make an Offer</h2>
              <p className="mb-6 text-slate-500">The seller is open to negotiation. Enter your best price.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Your Offer Amount ($)</label>
                  <input
                    type="number"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder={`e.g. ${listing.price - 10}`}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-xl font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                
                <button
                  onClick={handleMakeOffer}
                  disabled={offering || !offerAmount}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100"
                >
                  {offering ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <>
                      <Tag className="h-5 w-5" />
                      Send Offer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
