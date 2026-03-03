import { useNavigate, Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, ShieldCheck, Truck, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface CartProps {
  cart: any[];
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  user: any;
}

export default function Cart({ cart, removeFromCart, clearCart, user }: CartProps) {
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  const subtotal = cart.reduce((acc, item) => acc + item.price, 0);
  const shippingFee = cart.length > 0 ? 15 : 0;
  const total = subtotal + shippingFee;

  const [shippingAddress, setShippingAddress] = useState('');

  const handleCheckout = async () => {
    if (!user) return navigate('/login');
    if (!shippingAddress) return setError('Please enter a shipping address');
    setCheckingOut(true);
    setError('');

    try {
      const res = await fetch('/api/transactions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          items: cart.map(i => i.id),
          total: total,
          shipping_address: shippingAddress
        })
      });

      if (res.ok) {
        clearCart();
        navigate('/wallet');
      } else {
        const data = await res.json();
        setError(data.error || 'Checkout failed');
      }
    } catch (err) {
      setError('Checkout failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <ShoppingBag className="h-12 w-12" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">Your cart is empty</h2>
        <p className="mb-8 text-slate-500">Looks like you haven't added anything to your cart yet.</p>
        <Link 
          to="/marketplace" 
          className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition-all hover:bg-blue-700"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="group relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-200">
              <Link to={`/listing/${item.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                <img 
                  src={JSON.parse(item.images || '[]')[0] || `https://picsum.photos/seed/${item.id}/200/200`} 
                  alt={item.title} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between">
                  <Link to={`/listing/${item.id}`} className="block group/title">
                    <h3 className="font-bold text-slate-900 group-hover/title:text-blue-600 transition-colors">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.category}</p>
                  </Link>
                  <p className="text-lg font-black text-blue-600">${item.price}</p>
                </div>
                <div className="flex justify-end">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      removeFromCart(item.id);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-xl font-bold">Order Summary</h3>
            
            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Shipping Address</label>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter your full address..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <div className="flex items-center gap-1">
                  <span>Shipping Fee</span>
                  <Truck className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold text-slate-900">${shippingFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-black text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
            >
              {checkingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  Checkout
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Secure Checkout
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 p-4 text-xs text-blue-700">
            <p className="font-bold mb-1">EcoTrade Guarantee</p>
            <p>Your purchase is protected. We hold the payment until you confirm that you've received the item as described.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
