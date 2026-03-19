import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Package, Star, Calendar, MapPin, Loader2, MessageSquare, CheckCircle, ShieldCheck, AtSign, X, Save, Fingerprint } from 'lucide-react';

export default function Profile({ user: initialUser }: { user: any }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(initialUser);
  const [listings, setListings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    bio: '',
    location: '',
    avatar_url: ''
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

      if (profileRes.ok) {
        setUser(profileData);
        setEditForm({
          name: profileData.name || '',
          username: profileData.username || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
          avatar_url: profileData.avatar_url || ''
        });
      }
      setListings(listingsData.filter((l: any) => l.seller_id === initialUser.id));
      setReviews(reviewsData);
    } catch (err) {
      console.error('Failed to fetch profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [initialUser.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Profile updated successfully');
        setIsEditing(false);
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyId = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/user/verify-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ nationalId })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Identity verified successfully');
        setIsVerifying(false);
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to verify identity');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* Notifications */}
      {(error || success) && (
        <div className={`fixed top-24 right-8 z-50 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-right ${error ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          <p className="font-bold">{error || success}</p>
          <button onClick={() => { setError(''); setSuccess(''); }} className="absolute top-2 right-2 opacity-50 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[3rem] bg-white p-10 shadow-sm border border-slate-100">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
          <div className="relative">
            <div className="h-32 w-32 rounded-[2.5rem] bg-blue-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name[0]
              )}
            </div>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="absolute -bottom-2 -right-2 rounded-full bg-white p-2 shadow-lg border border-slate-100 hover:text-blue-600 transition-all active:scale-95"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 md:justify-start">
                <h1 className="text-3xl font-bold">{user.name}</h1>
                {user.is_verified === 1 && (
                  <CheckCircle className="h-6 w-6 text-blue-500 fill-blue-50" />
                )}
              </div>
              <div className="flex items-center justify-center gap-1 text-slate-500 md:justify-start">
                <AtSign className="h-4 w-4" />
                <span className="font-medium">{user.username || 'no-username'}</span>
              </div>
              <p className="text-slate-400 text-sm">{user.email}</p>
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

            {user.is_verified !== 1 && (
              <button 
                onClick={() => setIsVerifying(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-100 transition-all"
              >
                <ShieldCheck className="h-4 w-4" />
                Verify Identity
              </button>
            )}
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

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[3rem] bg-white p-10 shadow-2xl animate-in zoom-in">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Edit Profile</h2>
              <button onClick={() => setIsEditing(false)} className="rounded-full p-2 hover:bg-slate-100"><X /></button>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Username</label>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={editForm.username} 
                      onChange={(e) => setEditForm({...editForm, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 pl-10 outline-none focus:border-blue-500 focus:bg-white"
                      placeholder="username"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Can only be changed once every 30 days.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bio</label>
                  <textarea 
                    value={editForm.bio} 
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none focus:border-blue-500 focus:bg-white"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Location</label>
                  <input 
                    type="text" 
                    value={editForm.location} 
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Save Changes</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Identity Verification Modal */}
      {isVerifying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[3rem] bg-white p-10 shadow-2xl animate-in zoom-in">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-600 p-2 text-white">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-2xl font-bold">Identity Verification</h2>
              </div>
              <button onClick={() => setIsVerifying(false)} className="rounded-full p-2 hover:bg-slate-100"><X /></button>
            </div>
            
            <div className="mb-8 space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                <ShieldCheck className="mt-1 shrink-0" size={18} />
                <p>Verifying your identity builds trust and unlocks higher transaction limits. Your ID is stored securely and encrypted.</p>
              </div>
            </div>

            <form onSubmit={handleVerifyId} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">National ID Number</label>
                <div className="relative">
                  <Fingerprint className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={nationalId} 
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="Enter ID Number"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none transition-all focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={actionLoading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="animate-spin" /> : 'Verify Now'}
              </button>
              
              <p className="text-center text-[10px] text-slate-400">
                By clicking verify, you agree to our data protection policy.
              </p>
            </form>
          </div>
        </div>
      )}

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

        {activeTab === 'listings' ? (
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
