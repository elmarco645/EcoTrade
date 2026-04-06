import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, DollarSign, Loader2, ArrowLeft, X, AlertCircle } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase';

export default function CreateListing({ user }: { user: any }) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!auth.currentUser) {
      setError('You must be logged in to upload images.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    console.log('[UPLOAD] Starting upload for', files.length, 'files');

    try {
      const urls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Max size is 5MB.`);
        }

        console.log('[UPLOAD] Uploading file:', file.name, 'size:', file.size);
        const storageRef = ref(storage, `listings/${auth.currentUser?.uid}/${Date.now()}_${file.name}`);
        
        const uploadTask = uploadBytesResumable(storageRef, file);

        const url = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
              console.log(`[UPLOAD] Progress for ${file.name}: ${progress}%`);
            }, 
            (error) => {
              console.error('[UPLOAD ERROR] Task failed:', error);
              reject(error);
            }, 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });

        urls.push(url);
        console.log('[UPLOAD] File uploaded successfully:', file.name, 'URL:', url);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));
    } catch (err: any) {
      console.error('[UPLOAD ERROR] Detailed error:', err);
      setError(`Failed to upload images: ${err.message || 'Unknown error'}`);
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
        })
      });

      const data = await res.json();

      if (res.ok) {
        navigate('/marketplace');
      } else {
        throw new Error(data.error || 'Failed to create listing');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
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
        {error && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Image Upload */}
        <div className="space-y-4">
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white p-12 text-center transition-all hover:border-blue-500 group cursor-pointer"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
              {uploading ? (
                <div className="relative flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="absolute text-[10px] font-bold">{Math.round(uploadProgress)}%</span>
                </div>
              ) : <Camera className="h-8 w-8" />}
            </div>
            <p className="mt-4 font-bold text-slate-900">
              {uploading ? `Uploading (${Math.round(uploadProgress)}%)...` : 'Upload Photos'}
            </p>
            <p className="mt-1 text-sm text-slate-400">Click to select files (Max 5MB each)</p>
          </div>

          {formData.images.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {formData.images.map((url, index) => (
                <div key={index} className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
          disabled={loading || uploading}
          className="flex h-16 w-full items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          {loading || uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Publish Listing'}
        </button>
      </form>
    </div>
  );
}
