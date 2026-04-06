import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, MapPin, DollarSign, Loader2, ArrowLeft, X, AlertCircle, Trash2, Save } from 'lucide-react';
import LocationSelector from '../components/LocationSelector';
import { uploadListingImages } from '../lib/uploadListingImages';

export default function EditListing({ user }: { user: any }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

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

  const [locationData, setLocationData] = useState({
    county: '',
    subcounty: '',
    ward: ''
  });

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      const res = await fetch(`/api/listings/${id}`);
      const data = await res.json();
      
      if (res.ok) {
        // Ownership check (optional but good for UX)
        if (data.seller_id !== user?.uid && data.seller_id !== user?.id) {
          setError('You are not authorized to edit this listing');
          setFetching(false);
          return;
        }

        setFormData({
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'Fashion',
          condition: data.condition || 'Good',
          price: data.price?.toString() || '',
          location: data.location || '',
          is_negotiable: !!data.is_negotiable,
          images: Array.isArray(data.images) ? data.images : []
        });
        
        if (data.location) {
          const parts = data.location.split(',').map((p: string) => p.trim());
          setLocationData({
            county: parts[0] || '',
            subcounty: parts[1] || '',
            ward: parts[2] || ''
          });
        }
      } else {
        setError(data.error || 'Failed to fetch listing');
      }
    } catch (err) {
      setError('Failed to fetch listing details');
    } finally {
      setFetching(false);
    }
  };

  const handleLocationChange = (loc: { county: string; subcounty: string; ward: string }) => {
    setLocationData(loc);
    const locationString = [loc.county, loc.subcounty, loc.ward].filter(Boolean).join(', ');
    setFormData(prev => ({ ...prev, location: locationString }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files);

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      for (const file of selectedFiles) {
        if (file.size > 5 * 1024 * 1024) throw new Error(`File ${file.name} is too large. Max 5MB.`);
      }

      const urls = await uploadListingImages(selectedFiles, (progress) => {
        setUploadProgress(progress);
      });

      setFormData(prev => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          is_negotiable: formData.is_negotiable ? 1 : 0,
          price: parseFloat(formData.price),
        })
      });

      const data = await res.json();
      if (res.ok) {
        navigate(`/listing/${id}`);
      } else {
        throw new Error(data.error || 'Failed to update listing');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this listing permanently?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        navigate('/profile');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete listing');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
        title="Go back to previous page"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Edit Your Ad</h1>
          <p className="text-slate-500 font-medium">Review and update details of your existing listing.</p>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-12 items-center gap-2 rounded-2xl bg-red-50 px-6 font-bold text-red-600 transition-all hover:bg-red-100"
        >
          <Trash2 size={18} />
          Delete Ad
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="flex items-center gap-3 rounded-3xl bg-red-50 p-6 text-sm font-bold text-red-600 border border-red-100">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Image Grid */}
        <div className="space-y-6">
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
            title="Upload listing images"
            placeholder="Select files"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 transition-all group"
              title="Upload product photos"
            >
              <div className="mb-2 rounded-xl bg-blue-50 p-3 text-blue-600 group-hover:scale-110 transition-transform">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Photos</span>
            </button>

            {Array.isArray(formData.images) && formData.images.map((url, index) => (
              <div key={index} className="group relative aspect-square overflow-hidden rounded-[2rem] bg-slate-100 shadow-sm border border-slate-100">
                <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 shadow-xl opacity-0 transition-opacity group-hover:opacity-100"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {uploading && (
             <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden" role="presentation">
                <span className="sr-only">Image upload progress: {Math.round(uploadProgress)}%</span>
                <div className="h-full bg-blue-600 transition-all dynamic-progress" style={{ '--progress': `${uploadProgress}%` } as React.CSSProperties} />
             </div>
          )}
        </div>

        <div className="grid gap-6 rounded-[3rem] bg-white p-10 shadow-xl shadow-slate-200/40 border border-slate-100">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Product Title</label>
            <input
              type="text"
              required
              title="Listing title"
              placeholder="Enter product title"
              className="h-16 w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
              <select
                className="h-16 w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                title="Product category"
                aria-label="Select product category"
              >
                <option>Fashion</option>
                <option>Electronics</option>
                <option>Home</option>
                <option>Books</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Item Condition</label>
              <select
                className="h-16 w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                value={formData.condition}
                onChange={e => setFormData({...formData, condition: e.target.value})}
                title="Item condition"
                aria-label="Select item condition"
              >
                <option>New</option>
                <option>Like New</option>
                <option>Good</option>
                <option>Fair</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Detailed Description</label>
            <textarea
              required
              rows={5}
              title="Product description"
              placeholder="Provide a detailed description of your item..."
              className="w-full rounded-3xl border border-slate-100 bg-slate-50 p-6 font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Price ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  required
                  title="Product price"
                  placeholder="0.00"
                  className="h-16 w-full rounded-2xl border border-slate-100 bg-slate-50 pl-14 pr-6 font-black text-blue-600 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all text-xl"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Pickup Location</label>
              <LocationSelector 
                onChange={handleLocationChange}
                initialLocation={locationData}
              />
            </div>
          </div>

          <label className="flex items-center gap-4 cursor-pointer group p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.is_negotiable ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
               {formData.is_negotiable && <X size={14} className="text-white rotate-45" />}
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={formData.is_negotiable}
              onChange={e => setFormData({...formData, is_negotiable: e.target.checked})}
            />
            <span className="text-sm font-black text-slate-700 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Price is negotiable</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || uploading}
          className="flex h-20 w-full items-center justify-center gap-3 rounded-[2rem] bg-blue-600 font-black text-white shadow-2xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all text-xl"
        >
          {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : <><Save size={24} /> Save Changes</>}
        </button>
      </form>
    </div>
  );
}
