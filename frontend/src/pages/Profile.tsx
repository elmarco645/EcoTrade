import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Settings, Package, Star, Calendar, MapPin, 
  Loader2, MessageSquare, CheckCircle, ShieldCheck, 
  AtSign, X, Save, Fingerprint, ExternalLink, 
  TrendingUp, ShoppingBag, Heart, MoreHorizontal,
  Twitter, Instagram, Globe, Share2, Camera,
  ChevronRight, Award, Zap, Shield, Download, Trash2, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    avatar_url: '',
    cover_url: '',
    social_links: {
      twitter: '',
      instagram: '',
      website: ''
    }
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
        let socialLinks = { twitter: '', instagram: '', website: '' };
        try {
          if (profileData.social_links) {
            socialLinks = typeof profileData.social_links === 'string' 
              ? JSON.parse(profileData.social_links) 
              : profileData.social_links;
          }
        } catch (e) {
          console.error("Error parsing social links", e);
        }

        setEditForm({
          name: profileData.name || '',
          username: profileData.username || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
          avatar_url: profileData.avatar_url || '',
          cover_url: profileData.cover_url || '',
          social_links: socialLinks
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

  const handleExportData = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/user/export-data', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ecotrade_data_${user.username || user.id}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setSuccess('Data export started successfully!');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to export data');
      }
    } catch (err) {
      setError('Error exporting data');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      setError('Please enter your password to confirm deletion');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          window.location.reload();
        }, 3000);
      } else {
        setError(data.error || 'Failed to schedule deletion');
      }
    } catch (err) {
      setError('Error scheduling deletion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setSuccess('Profile link copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(type, file);

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/user/upload-${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`${type === 'avatar' ? 'Profile picture' : 'Cover image'} updated successfully`);
        fetchData();
      } else {
        setError(data.error || `Failed to upload ${type}`);
      }
    } catch (err) {
      setError(`Error uploading ${type}`);
    } finally {
      setActionLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        >
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </motion.div>
      </div>
    );
  }

  const socialLinks = typeof user.social_links === 'string' ? JSON.parse(user.social_links || '{}') : (user.social_links || {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Notifications */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-24 right-8 z-50 flex items-center gap-3 rounded-2xl p-4 shadow-2xl backdrop-blur-md ${error ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}
          >
            <div className="rounded-full bg-white/20 p-1">
              {error ? <X size={16} /> : <CheckCircle size={16} />}
            </div>
            <p className="font-semibold">{error || success}</p>
            <button onClick={() => { setError(''); setSuccess(''); }} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[2.5rem] bg-white shadow-xl shadow-slate-200/50 border border-slate-100"
          >
            {/* Cover Image */}
            <div className="h-40 bg-slate-100 relative group overflow-hidden">
              {user.cover_url ? (
                <img src={user.cover_url} alt="Cover" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.8),transparent)]" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button 
                  onClick={() => coverInputRef.current?.click()} 
                  className="rounded-full bg-white/20 backdrop-blur-md p-3 text-white hover:bg-white/40 transition-all"
                  title="Upload Cover"
                >
                  <Camera size={20} />
                </button>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="rounded-full bg-white/20 backdrop-blur-md p-3 text-white hover:bg-white/40 transition-all"
                  title="Edit Profile"
                >
                  <Settings size={20} />
                </button>
              </div>
              <input 
                type="file" 
                ref={coverInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleFileChange(e, 'cover')} 
              />
            </div>

            <div className="px-8 pb-8">
              <div className="relative -mt-16 mb-6 flex justify-center lg:justify-start">
                <div className="h-32 w-32 rounded-[2.5rem] bg-white p-1.5 shadow-2xl relative group">
                  <div className="h-full w-full rounded-[2rem] bg-slate-100 overflow-hidden flex items-center justify-center text-4xl font-black text-blue-600">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      user.name[0]
                    )}
                  </div>
                  <button 
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-1.5 rounded-[2rem] bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <Camera size={24} />
                  </button>
                  <input 
                    type="file" 
                    ref={avatarInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'avatar')} 
                  />
                </div>
                <div className="absolute bottom-0 right-0 lg:right-auto lg:left-24 flex gap-2">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsEditing(true)}
                    className="rounded-2xl bg-white p-3 shadow-xl border border-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Settings className="h-5 w-5" />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleShare}
                    className="rounded-2xl bg-white p-3 shadow-xl border border-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <Share2 className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              <div className="text-center lg:text-left space-y-4">
                <div>
                  <div className="flex items-center justify-center lg:justify-start gap-2">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{user.name}</h1>
                    {user.is_verified === 1 && (
                      <div className="group relative">
                        <CheckCircle className="h-5 w-5 text-blue-500 fill-blue-50" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white whitespace-nowrap">Verified Identity</span>
                      </div>
                    )}
                    {user.is_seller_verified === 1 && (
                      <div className="group relative">
                        <ShieldCheck className="h-5 w-5 text-emerald-500 fill-emerald-50" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white whitespace-nowrap">Verified Seller</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center lg:justify-start gap-1.5 mt-1 text-slate-500">
                    <AtSign className="h-3.5 w-3.5" />
                    <span className="text-sm font-semibold tracking-tight">{user.username || 'no-username'}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {user.bio || 'Passionate about sustainable fashion and giving pre-loved items a new home.'}
                </p>

                {/* Social Links */}
                <div className="flex items-center justify-center lg:justify-start gap-4 pt-2">
                  {socialLinks.twitter && (
                    <a href={`https://twitter.com/${socialLinks.twitter}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors">
                      <Twitter size={18} />
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a href={`https://instagram.com/${socialLinks.instagram}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-pink-500 transition-colors">
                      <Instagram size={18} />
                    </a>
                  )}
                  {socialLinks.website && (
                    <a href={socialLinks.website.startsWith('http') ? socialLinks.website : `https://${socialLinks.website}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-emerald-500 transition-colors">
                      <Globe size={18} />
                    </a>
                  )}
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                      <MapPin size={16} />
                    </div>
                    {user.location || 'Nairobi, Kenya'}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                      <Calendar size={16} />
                    </div>
                    Joined {new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>

                {user.is_verified !== 1 && (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsVerifying(true)}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify Identity
                  </motion.button>
                )}

                {/* Account Actions / Danger Zone */}
                <div className="pt-8 mt-8 border-t border-slate-100 space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Account Management</h3>
                  
                  <motion.button 
                    whileHover={{ x: 5 }}
                    onClick={handleExportData}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-between group rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white p-2 text-slate-400 group-hover:text-blue-500 shadow-sm transition-colors">
                        <Download size={16} />
                      </div>
                      Export My Data
                    </div>
                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all" />
                  </motion.button>

                  <motion.button 
                    whileHover={{ x: 5 }}
                    onClick={() => setIsDeleting(true)}
                    className="flex w-full items-center justify-between group rounded-2xl bg-red-50/50 p-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white p-2 text-red-400 group-hover:text-red-600 shadow-sm transition-colors">
                        <Trash2 size={16} />
                      </div>
                      Delete Account
                    </div>
                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-all" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions Bento */}
          <div className="grid grid-cols-2 gap-4">
            <motion.button 
              whileHover={{ y: -4 }}
              onClick={() => navigate('/orders')}
              className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-white p-6 shadow-lg shadow-slate-100 border border-slate-100 group"
            >
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ShoppingBag size={20} />
              </div>
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Orders</span>
            </motion.button>
            <motion.button 
              whileHover={{ y: -4 }}
              onClick={() => navigate('/offers')}
              className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-white p-6 shadow-lg shadow-slate-100 border border-slate-100 group"
            >
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Offers</span>
            </motion.button>
          </div>

          {/* Achievements / Badges */}
          <div className="rounded-[2rem] bg-slate-900 p-8 text-white space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Achievements</h3>
              <Award className="text-blue-400" size={16} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                  <Zap size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold">Fast Responder</p>
                  <p className="text-[10px] text-slate-400">Replies within 1 hour</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold">Trusted Seller</p>
                  <p className="text-[10px] text-slate-400">10+ successful trades</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Listings', value: listings.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Sold', value: '12', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Rating', value: user.rating ? user.rating.toFixed(1) : '5.0', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
              { label: 'Reviews', value: reviews.length, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-100 border border-slate-100 text-center"
              >
                <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Tabs & Content */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 relative">
              <div className="flex gap-8">
                {['listings', 'reviews'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`relative pb-4 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {tab} ({tab === 'listings' ? listings.length : reviews.length})
                    {activeTab === tab && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'listings' ? (
                listings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
                    <div className="mb-4 rounded-full bg-white p-6 shadow-xl shadow-slate-200/50">
                      <Package className="text-slate-300" size={48} />
                    </div>
                    <p className="text-lg font-bold text-slate-400">No active listings yet.</p>
                    <button 
                      onClick={() => navigate('/create-listing')}
                      className="mt-4 text-sm font-black text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Start Selling
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {listings.map((listing, i) => (
                      <motion.div 
                        key={listing.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -8 }}
                        className="group relative overflow-hidden rounded-[2rem] bg-white p-4 shadow-xl shadow-slate-200/30 border border-slate-100 transition-all"
                      >
                        <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100 relative">
                          <img
                            src={JSON.parse(listing.images || '[]')[0] || `https://picsum.photos/seed/${listing.id}/400/400`}
                            alt={listing.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-3 right-3">
                            <div className="rounded-full bg-white/90 backdrop-blur-md p-2 text-slate-900 shadow-lg">
                              <Heart size={16} className="group-hover:fill-red-500 group-hover:text-red-500 transition-colors" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-bold text-slate-900 line-clamp-1">{listing.title}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{listing.category}</p>
                          </div>
                          <p className="text-lg font-black text-blue-600">${listing.price}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{listing.condition}</span>
                          <button 
                            onClick={() => navigate(`/listing/${listing.id}`)}
                            className="rounded-full bg-slate-50 p-2 text-slate-400 hover:bg-blue-600 hover:text-white transition-colors"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              ) : (
                reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
                    <div className="mb-4 rounded-full bg-white p-6 shadow-xl shadow-slate-200/50">
                      <MessageSquare className="text-slate-300" size={48} />
                    </div>
                    <p className="text-lg font-bold text-slate-400">No reviews received yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {reviews.map((review, i) => (
                      <motion.div 
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/20 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-6 text-slate-100">
                          <MessageSquare size={80} strokeWidth={1} />
                        </div>
                        <div className="relative z-10">
                          <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg">
                                {review.buyer_name?.[0]}
                              </div>
                              <div>
                                <p className="font-black text-slate-900">{review.buyer_name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(review.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`h-4 w-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-slate-600 italic leading-relaxed font-medium">"{review.review_text}"</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl rounded-[3.5rem] bg-white p-10 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Edit Profile</h2>
                <button onClick={() => setIsEditing(false)} className="rounded-2xl bg-slate-50 p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Name</label>
                      <input 
                        type="text" 
                        value={editForm.name} 
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Username</label>
                      <div className="relative">
                        <AtSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={editForm.username} 
                          onChange={(e) => setEditForm({...editForm, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 pl-10 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                          placeholder="username"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bio</label>
                      <textarea 
                        value={editForm.bio} 
                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Avatar URL</label>
                      <input 
                        type="text" 
                        value={editForm.avatar_url} 
                        onChange={(e) => setEditForm({...editForm, avatar_url: e.target.value})}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cover URL</label>
                      <input 
                        type="text" 
                        value={editForm.cover_url} 
                        onChange={(e) => setEditForm({...editForm, cover_url: e.target.value})}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Location</label>
                      <input 
                        type="text" 
                        value={editForm.location} 
                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Social Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Twitter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={editForm.social_links.twitter} 
                        onChange={(e) => setEditForm({...editForm, social_links: {...editForm.social_links, twitter: e.target.value}})}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 pl-10 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="Twitter"
                      />
                    </div>
                    <div className="relative">
                      <Instagram className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={editForm.social_links.instagram} 
                        onChange={(e) => setEditForm({...editForm, social_links: {...editForm.social_links, instagram: e.target.value}})}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 pl-10 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="Instagram"
                      />
                    </div>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={editForm.social_links.website} 
                        onChange={(e) => setEditForm({...editForm, social_links: {...editForm.social_links, website: e.target.value}})}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 pl-10 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="Website"
                      />
                    </div>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={actionLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-5 font-black text-white shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {actionLoading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Save Changes</>}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}

        {isVerifying && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVerifying(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md rounded-[3.5rem] bg-white p-10 shadow-2xl border border-slate-100"
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-200">
                    <ShieldCheck size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verification</h2>
                </div>
                <button onClick={() => setIsVerifying(false)} className="rounded-2xl bg-slate-50 p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-8 space-y-4">
                <div className="flex items-start gap-3 rounded-3xl bg-blue-50 p-6 text-sm font-medium text-blue-800 border border-blue-100">
                  <ShieldCheck className="mt-1 shrink-0" size={18} />
                  <p>Verifying your identity builds trust and unlocks higher transaction limits. Your ID is stored securely and encrypted.</p>
                </div>
              </div>

              <form onSubmit={handleVerifyId} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">National ID Number</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={nationalId} 
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="Enter ID Number"
                      className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 font-semibold outline-none transition-all focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={actionLoading}
                  className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 font-black text-white shadow-xl shadow-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                  {actionLoading ? <Loader2 className="animate-spin" /> : 'Verify Identity'}
                </motion.button>
                
                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Secure Encryption Enabled
                </p>
              </form>
            </motion.div>
          </div>
        )}

        {isDeleting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleting(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md rounded-[3.5rem] bg-white p-10 shadow-2xl border border-slate-100"
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-red-600 p-3 text-white shadow-lg shadow-red-200">
                    <Trash2 size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Delete Account</h2>
                </div>
                <button onClick={() => setIsDeleting(false)} className="rounded-2xl bg-slate-50 p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-8 space-y-4">
                <div className="flex items-start gap-3 rounded-3xl bg-red-50 p-6 text-sm font-medium text-red-800 border border-red-100">
                  <Shield size={18} className="mt-1 shrink-0" />
                  <p>This action will schedule your account for deletion. You will have 7 days to restore it before your data is permanently anonymized.</p>
                </div>
              </div>

              <form onSubmit={handleDeleteAccount} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      required
                      value={deletePassword} 
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 font-semibold outline-none transition-all focus:border-red-500 focus:bg-white"
                    />
                  </div>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={actionLoading}
                  className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 font-black text-white shadow-xl shadow-red-200 hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {actionLoading ? <Loader2 className="animate-spin" /> : 'Confirm Deletion'}
                </motion.button>
                
                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Secure Verification Required
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
