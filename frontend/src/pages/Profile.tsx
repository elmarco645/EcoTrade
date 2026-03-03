import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Package, Star, Calendar, MapPin, Loader2 } from 'lucide-react';

export default function Profile({ user }: { user: any }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we'd fetch listings for this specific user
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => {
        setListings(data.filter((l: any) => l.seller_id === user.id));
        setLoading(false);
      });
  }, [user.id]);

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
                4.8 Rating
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Calendar className="h-4 w-4 text-blue-500" />
                Joined March 2024
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <MapPin className="h-4 w-4 text-red-500" />
                London, UK
              </div>
            </div>

            <p className="max-w-xl text-slate-600 leading-relaxed">
              Passionate about sustainable fashion and giving pre-loved items a new home. Check out my latest listings below!
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

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">My Listings</h2>
          <button className="text-sm font-bold text-blue-600 hover:underline">View All</button>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : listings.length === 0 ? (
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
        )}
      </div>
    </div>
  );
}
