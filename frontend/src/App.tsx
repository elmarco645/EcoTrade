/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Navbar from './components/Navbar';
import Breadcrumbs from './components/Breadcrumbs';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import UndoDelete from './pages/UndoDelete';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Offers from './pages/Offers';
import SearchResults from './pages/SearchResults';
import PaymentSuccess from './pages/PaymentSuccess';
import NotFound from './pages/NotFound';

function NavigationLogger() {
  const location = useLocation();
  useEffect(() => {
    console.log('[APP] Navigated to:', location.pathname);
  }, [location]);
  return null;
}

console.log('[APP] App.tsx module loaded');

export default function App() {
  console.log('[APP] Rendering App component');
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    console.log('[APP] Initializing auth listener');
    
    // Global error handler
    const handleError = (event: ErrorEvent) => {
      console.error('[GLOBAL ERROR]', event.error);
    };
    window.addEventListener('error', handleError);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[APP] Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('token', token);
        
        // Use Firebase user directly as requested (no database)
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
          emailVerified: firebaseUser.emailVerified,
          username: firebaseUser.displayName?.toLowerCase().replace(/\s/g, '') || firebaseUser.email?.split('@')[0],
          wallet_balance: 0,
          role: 'user'
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    });

    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('username');
    localStorage.removeItem('avatar');
    setUser(null);
  };

  const addToCart = (item: any) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) return prev;
      return [...prev, item];
    });
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <Router>
      <NavigationLogger />
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Navbar user={user} onLogout={handleLogout} cartCount={cart.length} />
        <Breadcrumbs user={user} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/listing/:id" element={<ListingDetail user={user} addToCart={addToCart} />} />
            <Route 
              path="/cart" 
              element={<Cart cart={cart} removeFromCart={removeFromCart} clearCart={clearCart} user={user} />} 
            />
            <Route 
              path="/create-listing" 
              element={user ? <CreateListing user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/profile" 
              element={user ? <Profile user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/wallet" 
              element={user ? <Wallet user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/chat" 
              element={user ? <Chat user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/orders" 
              element={user ? <Orders user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/offers" 
              element={user ? <Offers user={user} /> : <Navigate to="/login" />} 
            />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/undo-delete" element={<UndoDelete />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

