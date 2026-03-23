/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      // Set initial user from localStorage for immediate UI feedback
      setUser(JSON.parse(savedUser));
      
      // Fetch latest profile data to sync state (e.g. verification status, balance)
      fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Session expired');
      })
      .then(data => {
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      })
      .catch(() => {
        handleLogout();
      });
    }
    
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const handleLogout = () => {
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

