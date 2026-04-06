import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, MapPin, DollarSign, Loader2, ArrowLeft, X, AlertCircle } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase';
import LocationSelector from '../components/LocationSelector';

export default function EditListing({ user }: { user: any }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${id}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to load listing');
        if (data.seller_id !== user.uid && data.seller_id !== user.id) {
          throw new Error('Unauthorized to edit this listing');
        }

        // Parse location string back if possible
        const locationParts = (data.location || '').split(',').map((s: string) => s.trim());
        const initLoc = {
          county: locationParts[0] || '',
          subcounty: locationParts[1] || '',
          ward: locationParts[2] || ''
        };

        let parsedImages = [];
        if (typeof data.images === 'string') {
          try {
            parsedImages = JSON.parse(data.images);
          } catch {
            parsedImages = [data.images];
          }
        } else if (Array.isArray(data.images)) {
          parsedImages = data.images;
        }

        setFormData({
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'Fashion',
          condition: data.condition || 'Good',
          price: (data.price || '').toString(),
          location: data.location || '',
          is_negotiable: !!data.is_negotiable,
          images: parsedImages
        });
        setLocationData(initLoc);
      } catch (err: any) {
        setError(err.message || 'Error fetching listing parameters');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchListing();
  }, [id, user]);

  const handleLocationChange = (loc: { county: string; subcounty: string; ward: string }) => {
    setLocationData(loc);
    const locationString = [loc.county, loc.subcounty, loc.ward].filter(Boolean).join(', ');
    setFormData(prev => ({ ...prev, location: locationString }));
  };

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

    try {
      const urls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Max size is 5MB.`);
        }

        const storageRef = ref(storage, `listings/${auth.currentUser?.uid}/${Date.now()}_${file.name}`);
         
        // Fallback for upload failures
        urls.push(await new Promise<string>((resolve, reject) => {
          const uploadTask = uploadBytesResumable(storageRef, file);
          uploadTask.on('state_changed', 
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100), 
            (error) => reject(error), 
            async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
          );
        }));
      }

      setFormData(prev => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (err: any) {
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

    setSaving(true);
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
        navigate('/profile');
      } else {
        throw new Error(data.error || 'Failed to update listing');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Edit Listing</h1>
        <p className="text-slate-500">Update the details of your item.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} aria-label="Upload Images" title="Upload Images" />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white p-12 text-center transition-all hover:border-blue-500 group cursor-pointer"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
              {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8" />}
            </div>
            <p className="mt-4 font-bold text-slate-900">{uploading ? 'Uploading...' : 'Upload More Photos'}</p>
          </div>

          {formData.images.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {formData.images.map((url, index) => (
                <div key={index} className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    title="Remove Image"
                    aria-label="Remove Image"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-lg"
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
            <input type="text" required placeholder="e.g. Vintage Denim Jacket" aria-label="Title" title="Title"
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Category</label>
              <select className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 outline-none focus:border-blue-500 focus:bg-white"
                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} aria-label="Category" title="Category">
                <option>Fashion</option><option>Electronics</option><option>Home</option><option>Books</option><option>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Condition</label>
              <select className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 outline-none focus:border-blue-500 focus:bg-white"
                value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} aria-label="Condition" title="Condition">
                <option>New</option><option>Like New</option><option>Good</option><option>Fair</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea required rows={4} aria-label="Description" title="Description" placeholder="Description"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-6 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Price ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input type="number" required placeholder="0.00" aria-label="Price" title="Price"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Location</label>
              <LocationSelector onChange={handleLocationChange} initialLocation={locationData} />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" className="h-6 w-6 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500"
              checked={formData.is_negotiable} onChange={e => setFormData({...formData, is_negotiable: e.target.checked})} />
            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">Price is negotiable</span>
          </label>
        </div>

        <button type="submit" disabled={saving || uploading}
          className="flex h-16 w-full items-center justify-center rounded-2xl bg-emerald-600 text-xl font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving || uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
