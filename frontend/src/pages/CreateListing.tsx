import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, DollarSign, Loader2, ArrowLeft } from 'lucide-react';

export default function CreateListing({ user }: { user: any }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Fashion',
    condition: 'Good',
    price: '',
    location: '',
    is_negotiable: false,
    images: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          is_negotiable: formData.is_negotiable ? 1 : 0,
          price: parseFloat(formData.price),
          images: formData.images.length > 0 ? formData.images : [`https://picsum.photos/seed/${Date.now()}/800/800`]
        })
      });
      if (res.ok) {
        navigate('/marketplace');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create Listing</h1>
        <p className="text-slate-500">Tell us about what you're selling.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Image Upload Placeholder */}
        <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white p-12 text-center transition-all hover:border-blue-500 group cursor-pointer">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
            <Camera className="h-8 w-8" />
          </div>
          <p className="mt-4 font-bold text-slate-900">Upload Photos</p>
          <p className="mt-1 text-sm text-slate-400">Drag and drop or click to select files</p>
        </div>

        <div className="grid gap-6 rounded-[2.5rem] bg-white p-10 shadow-sm border border-slate-100">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Vintage Denim Jacket"
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Category</label>
              <select
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 outline-none focus:border-blue-500 focus:bg-white"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option>Fashion</option>
                <option>Electronics</option>
                <option>Home</option>
                <option>Books</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Condition</label>
              <select
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 outline-none focus:border-blue-500 focus:bg-white"
                value={formData.condition}
                onChange={e => setFormData({...formData, condition: e.target.value})}
              >
                <option>New</option>
                <option>Like New</option>
                <option>Good</option>
                <option>Fair</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea
              required
              rows={4}
              placeholder="Describe the item's condition, size, brand, etc."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-6 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Price ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="City, Country"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              className="h-6 w-6 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500"
              checked={formData.is_negotiable}
              onChange={e => setFormData({...formData, is_negotiable: e.target.checked})}
            />
            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">Price is negotiable</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-16 w-full items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Publish Listing'}
        </button>
      </form>
    </div>
  );
}
