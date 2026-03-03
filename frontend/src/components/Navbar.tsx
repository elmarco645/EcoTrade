import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, MessageSquare, Wallet, User, LogOut, Search, PlusCircle, ShoppingCart } from 'lucide-react';

interface NavbarProps {
  user: any;
  onLogout: () => void;
  cartCount: number;
}

export default function Navbar({ user, onLogout, cartCount }: NavbarProps) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-blue-600">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            E
          </div>
          <span>EcoTrade</span>
        </Link>

        <div className="hidden max-w-md flex-1 px-8 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search items, brands, or categories..."
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/marketplace" className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-600">
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
            <>
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
                  className={`flex h-10 w-10 items-center justify-center rounded-full border bg-white transition-all ${
                    isMenuOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-500'
                  }`}
                >
                  <User className="h-5 w-5 text-slate-600" />
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
                        onLogout();
                        setIsMenuOpen(false);
                        navigate('/');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
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
  );
}
