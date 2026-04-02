import { useState, useRef, useEffect } from 'react';
import { getFirstImage } from '../lib/imageUtils';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, MessageSquare, Wallet, User, LogOut, Search, PlusCircle, ShoppingCart, X, ShieldCheck } from 'lucide-react';
import LogoutConfirmModal from './LogoutConfirmModal';

interface NavbarProps {
  user: any;
  onLogout: () => void;
  cartCount: number;
}

export default function Navbar({ user, onLogout, cartCount }: NavbarProps) {
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-blue-600">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            E
          </div>
          <span className={`${isMobileSearchOpen ? 'hidden sm:block' : ''}`}>EcoTrade</span>
        </Link>

        <div className={`flex-1 px-4 md:px-8 ${isMobileSearchOpen ? 'block' : 'hidden md:block'}`}>
          <form onSubmit={handleSearch} className="relative mx-auto max-w-md" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length > 1 && setShowSuggestions(true)}
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            {isMobileSearchOpen && (
              <button 
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 md:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
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
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <img
                        src={getFirstImage(item.images, item.id)}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.category} • ${item.price}</div>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex w-full items-center justify-center border-t border-slate-100 py-3 text-xs font-bold text-blue-600 hover:bg-slate-50"
                >
                  View all results for "{searchQuery}"
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <button 
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <Search className="h-5 w-5" />
          </button>

          <Link to="/marketplace" className="hidden items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-600 sm:flex">
            <ShoppingBag className="h-4 w-4" />
            <span>Shop</span>
          </Link>

          <Link to="/cart" className="relative flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-600">
            <ShoppingCart className="h-4 w-4" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-3 md:gap-4">
              <Link to="/chat" className="relative flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-600">
                <MessageSquare className="h-4 w-4" />
                <span>Messages</span>
              </Link>
              <Link to="/wallet" className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-600">
                <Wallet className="h-4 w-4" />
                <span>Wallet</span>
              </Link>
              <Link to="/create-listing" className="flex items-center gap-1 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700">
                <PlusCircle className="h-4 w-4" />
                <span>Sell</span>
              </Link>
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border bg-white transition-all ${
                    isMenuOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-500'
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
                    <User className="h-5 w-5 text-slate-600" />
                  )}
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in duration-200">
                    <Link 
                      to="/profile" 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link 
                      to="/orders" 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      My Orders
                    </Link>
                    <Link 
                      to="/offers" 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Negotiations
                    </Link>
                    <button
                      onClick={() => {
                        setIsLogoutModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="text-xs font-medium text-slate-500">
                  {getGreetingText()}
                </span>
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                  {(user.username || user.name || 'User').charAt(0).toUpperCase() + (user.username || user.name || 'User').slice(1)}
                  {user.is_seller_verified === 1 && (
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-50" />
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600">
                Sign In
              </Link>
              <Link to="/register" className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700">
                Sign Up
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
          onLogout();
          setIsLogoutModalOpen(false);
          navigate('/');
        }}
      />
    </>
  );
}
