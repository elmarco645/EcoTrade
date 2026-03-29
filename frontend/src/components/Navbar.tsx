import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, MessageSquare, Wallet, User as UserIcon, LogOut, Search, PlusCircle, ShoppingCart, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser } from '../context/userContext';
import { useCart } from '../context/cartContext';
import LogoutConfirmModal from './LogoutConfirmModal';

export default function Navbar() {
  const { user, logout } = useUser();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => setListings(data))
      .catch(err => console.error('Error fetching listings for search:', err));
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filtered = listings.filter(l => 
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, listings]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e?: any) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSuggestions(false);
    setIsMobileSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <>
      <nav className="glass sticky top-0 z-50 w-full border-b border-surface-200">
        <div className="container mx-auto flex h-18 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white font-black text-xl shadow-lg shadow-primary-500/20"
            >
              E
            </motion.div>
            <span className={`text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent ${isMobileSearchOpen ? 'hidden sm:block' : ''}`}>
              EcoTrade
            </span>
          </Link>

          <div className={`flex-1 px-4 md:px-12 ${isMobileSearchOpen ? 'block' : 'hidden md:block'}`}>
            <form onSubmit={handleSearch} className="relative mx-auto max-w-lg" ref={searchRef}>
              <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search eco-friendly treasures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length > 1 && setShowSuggestions(true)}
                className="h-12 w-full rounded-2xl border border-surface-200 bg-surface-100/50 pl-12 pr-4 text-sm outline-none transition-all focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 placeholder:text-slate-400"
              />
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 right-0 top-full mt-3 overflow-hidden rounded-3xl border border-surface-200 bg-white p-2 shadow-2xl"
                  >
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          navigate(`/listing/${item.id}`);
                          setShowSuggestions(false);
                          setIsMobileSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-surface-100 rounded-2xl transition-colors group"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-200">
                          <img
                            src={JSON.parse(item.images || '[]')[0] || `https://picsum.photos/seed/${item.id}/100/100`}
                            alt=""
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</div>
                          <div className="text-xs font-medium text-slate-500">{item.category} • ${item.price}</div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSearch}
                      className="flex w-full items-center justify-center border-t border-surface-100 py-4 text-xs font-bold text-primary-500 hover:text-primary-600 transition-colors"
                    >
                      View all results for "{searchQuery}"
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              aria-label="Toggle search"
              title="Toggle search"
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-600 hover:bg-surface-100 transition-colors md:hidden"
            >
              <Search className="h-5 w-5" />
            </button>

            <Link to="/marketplace" className="hidden items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary-500 transition-colors sm:flex">
              <ShoppingBag className="h-5 w-5" />
              <span>Shop</span>
            </Link>

            <Link to="/cart" className="relative flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary-500 transition-colors">
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline">Cart</span>
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] font-black text-white shadow-lg shadow-primary-500/30"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {user ? (
              <div className="flex items-center gap-4 md:gap-6">
                <Link to="/chat" className="relative flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary-500 transition-colors">
                  <MessageSquare className="h-5 w-5" />
                  <span className="hidden lg:inline">Messages</span>
                </Link>
                <Link to="/wallet" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary-500 transition-colors">
                  <Wallet className="h-5 w-5" />
                  <span className="hidden lg:inline">Wallet</span>
                </Link>
                <Link to="/create-listing" className="btn-primary group flex items-center gap-2 px-6 py-2.5 text-sm">
                  <PlusCircle className="h-5 w-5" />
                  <span>Sell Item</span>
                </Link>
                
                <div className="relative" ref={menuRef}>
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle profile menu"
                    title="Profile menu"
                    className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border bg-white transition-all ${
                      isMenuOpen ? 'border-primary-500 ring-4 ring-primary-500/10' : 'border-surface-200 hover:border-primary-500'
                    }`}
                  >
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.username} 
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UserIcon className="h-5 w-5 text-slate-600" />
                    )}
                  </button>
                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 top-full mt-3 w-56 rounded-3xl border border-surface-200 bg-white p-2 shadow-2xl"
                      >
                        <div className="px-3 py-3 border-b border-surface-100 mb-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{getGreetingText()}</p>
                          <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                            {user.username}
                            {!!user.is_seller_verified && (
                              <ShieldCheck className="h-3.5 w-3.5 text-primary-500 fill-primary-50" />
                            )}
                          </p>
                        </div>
                        <Link 
                          to="/profile" 
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-surface-100 hover:text-primary-500 transition-colors"
                        >
                          <UserIcon className="h-4.5 w-4.5" />
                          My Profile
                        </Link>
                        <Link 
                          to="/orders" 
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-surface-100 hover:text-primary-500 transition-colors"
                        >
                          <ShoppingBag className="h-4.5 w-4.5" />
                          My Orders
                        </Link>
                        <Link 
                          to="/offers" 
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-surface-100 hover:text-primary-500 transition-colors"
                        >
                          <PlusCircle className="h-4.5 w-4.5" />
                          Negotiations
                        </Link>
                        <button
                          onClick={() => {
                            setIsLogoutModalOpen(true);
                            setIsMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors mt-1"
                        >
                          <LogOut className="h-4.5 w-4.5" />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-primary-500 transition-colors">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary px-8 py-2.5 text-sm shadow-primary-500/20">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          logout();
          setIsLogoutModalOpen(false);
          navigate('/');
        }}
      />
    </>
  );
}
