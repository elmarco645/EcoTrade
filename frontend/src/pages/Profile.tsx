import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Package, Star, Calendar, MapPin, Loader2, MessageSquare } from 'lucide-react';

export default function Profile({ user: initialUser }: { user: any }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(initialUser);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, listingsRes, reviewsRes] = await Promise.all([
          fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
          fetch('/api/listings'),
          fetch(`/api/sellers/${initialUser.id}/reviews`)
        ]);

        const profileData = await profileRes.json();
        const listingsData = await listingsRes.json();
        const reviewsData = await reviewsRes.json();

        if (profileRes.ok) setUser(profileData);
        setListings(listingsData.filter((l: any) => l.seller_id === initialUser.id));
        setReviews(reviewsData);
      } catch (err) {
        console.error('Failed to fetch profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialUser.id]);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="relative overflow-hidden rounded-[3rem] bg-white p-10 shadow-sm border border-slate-100">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
          <div className="relative">
            <div className="h-32 w-32 rounded-[2.5rem] bg-blue-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
              {user.name[0]}
            </div>
            <button className="absolute -bottom-2 -right-2 rounded-full bg-white p-2 shadow-lg border border-slate-100 hover:text-blue-600">
              <Settings className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h1 className="text-3xl font-bold">{user.name}</h1>
              <p className="text-slate-500">{user.email}</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 md:justify-start">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                {user.rating ? user.rating.toFixed(1) : 'No'} Rating
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Calendar className="h-4 w-4 text-blue-500" />
                Joined {new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <MapPin className="h-4 w-4 text-red-500" />
                {user.location || 'Nairobi, Kenya'}
              </div>
            </div>

            <p className="max-w-xl text-slate-600 leading-relaxed">
              {user.bio || 'Passionate about sustainable fashion and giving pre-loved items a new home. Check out my latest listings below!'}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="rounded-3xl bg-slate-50 p-6 text-center border border-slate-100 min-w-[100px]">
                <p className="text-2xl font-black text-blue-600">{listings.length}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Listings</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-6 text-center border border-slate-100 min-w-[100px]">
                <p className="text-2xl font-black text-emerald-600">12</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sold</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/orders')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Package className="h-4 w-4" />
                My Orders
              </button>
              <button 
                onClick={() => navigate('/offers')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Star className="h-4 w-4" />
                Negotiations
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100">
          <div className="flex gap-8">
            <button 
              onClick={() => setActiveTab('listings')}
              className={`pb-4 text-lg font-bold transition-all ${activeTab === 'listings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              My Listings ({listings.length})
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`pb-4 text-lg font-bold transition-all ${activeTab === 'reviews' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Reviews ({reviews.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : activeTab === 'listings' ? (
          listings.length === 0 ? (
            <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center">
              <Package className="mx-auto mb-4 opacity-10" size={64} />
              <p className="text-lg font-medium text-slate-400">You haven't listed anything yet.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <div key={listing.id} className="group relative overflow-hidden rounded-3xl bg-white p-4 shadow-sm border border-slate-100 transition-all hover:shadow-xl">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
                    <img
                      src={JSON.parse(listing.images || '[]')[0] || `https://picsum.photos/seed/${listing.id}/400/400`}
                      alt={listing.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="mt-4 space-y-1">
                    <h3 className="font-bold text-slate-900">{listing.title}</h3>
                    <p className="text-lg font-black text-blue-600">${listing.price}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          reviews.length === 0 ? (
            <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center">
              <MessageSquare className="mx-auto mb-4 opacity-10" size={64} />
              <p className="text-lg font-medium text-slate-400">No reviews yet.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600">
                        {review.buyer_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{review.buyer_name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 italic leading-relaxed">"{review.review_text}"</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
