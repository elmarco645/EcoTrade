import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Filter, MapPin, Tag, Star, X, ChevronDown, Check, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFirstImage } from '../lib/imageUtils';

const CATEGORIES = [
  'Electronics', 'Phones & Tablets', 'Computers & Laptops', 'Fashion', 
  'Home & Furniture', 'Vehicles', 'Gaming', 'Appliances', 'Books', 
  'Beauty & Health', 'Sports', 'Other'
];

const CONDITIONS = ['New', 'Like New', 'Used - Good', 'Used - Fair', 'Refurbished'];

const LOCATIONS = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Thika'];

export default function SearchResults() {
  const { search: urlSearch } = useLocation();
  const query = new URLSearchParams(urlSearch).get('q') || '';
  
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    category: '',
    condition: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    isNegotiable: false
  });

  useEffect(() => {
    setLoading(true);
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => {
        setListings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Search fetch error:', err);
        setListings([]);
        setLoading(false);
      });
  }, []);

  const filteredListings = Array.isArray(listings) ? listings.filter(l => {
    const matchesSearch = (l.title || '').toLowerCase().includes(query.toLowerCase()) ||
                         (l.category || '').toLowerCase().includes(query.toLowerCase()) ||
                         (l.description || '').toLowerCase().includes(query.toLowerCase());
    
    const matchesCategory = !filters.category || l.category === filters.category;
    const matchesCondition = !filters.condition || l.condition === filters.condition;
    const matchesLocation = !filters.location || l.location === filters.location;
    const matchesMinPrice = !filters.minPrice || l.price >= Number(filters.minPrice);
    const matchesMaxPrice = !filters.maxPrice || l.price <= Number(filters.maxPrice);
    const matchesNegotiable = !filters.isNegotiable || l.is_negotiable === 1;

    return matchesSearch && matchesCategory && matchesCondition && 
           matchesLocation && matchesMinPrice && matchesMaxPrice && matchesNegotiable;
  }) : [];

  const resetFilters = () => {
    setFilters({
      category: '',
      condition: '',
      location: '',
      minPrice: '',
      maxPrice: '',
      isNegotiable: false
    });
  };

  const activeFilterCount = Object.entries(filters).reduce((acc, [key, value]) => {
    if (key === 'isNegotiable') return value ? acc + 1 : acc;
    return value ? acc + 1 : acc;
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/marketplace" className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Link>
          <h1 className="text-3xl font-bold">Search Results</h1>
          <p className="text-slate-500">
            {loading ? 'Searching...' : `Found ${filteredListings.length} results for "${query}"`}
          </p>
        </div>
        
        <button 
          onClick={() => setShowFilters(true)}
          className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-medium text-slate-600 hover:bg-slate-50 lg:hidden"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar Filters - Desktop */}
        <aside className="hidden w-64 shrink-0 space-y-8 lg:block">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Filters</h2>
            {activeFilterCount > 0 && (
              <button 
                onClick={resetFilters}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-6">
            {/* Category */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Category</h3>
              <div className="space-y-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilters(f => ({ ...f, category: f.category === cat ? '' : cat }))}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      filters.category === cat ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                    {filters.category === cat && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Price Range</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Condition */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Condition</h3>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map(cond => (
                  <button
                    key={cond}
                    onClick={() => setFilters(f => ({ ...f, condition: f.condition === cond ? '' : cond }))}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filters.condition === cond ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Location</h3>
              <select
                value={filters.location}
                onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">All Locations</option>
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Negotiable */}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={filters.isNegotiable}
                onChange={(e) => setFilters(f => ({ ...f, isNegotiable: e.target.checked }))}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Negotiable only</span>
            </label>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse space-y-4">
                  <div className="aspect-square rounded-3xl bg-slate-200" />
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-6 text-slate-400">
                <Search size={48} />
              </div>
              <h2 className="text-xl font-bold">No results found for "{query}"</h2>
              <p className="text-slate-500">Try adjusting your filters or search terms.</p>
              <button 
                onClick={resetFilters}
                className="mt-6 font-bold text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredListings.map((listing, idx) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    to={`/listing/${listing.id}`}
                    className="group block space-y-4 rounded-[2rem] border border-transparent bg-white p-4 transition-all hover:border-slate-200 hover:shadow-xl"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                      <img
                        src={getFirstImage(listing.images, listing.id)}
                        alt={listing.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-blue-600 backdrop-blur-sm">
                        {listing.condition}
                      </div>
                    </div>
                    <div className="space-y-1 px-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{listing.category}</span>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                          <Star className="h-3 w-3 fill-current" />
                          {listing.seller_rating || 'New'}
                        </div>
                      </div>
                      <h3 className="line-clamp-1 font-bold text-slate-900">{listing.title}</h3>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-lg font-black text-blue-600">${listing.price}</span>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" />
                          {listing.location}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 z-[70] w-full max-w-xs bg-white p-6 shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="rounded-full p-2 hover:bg-slate-100">
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-8">
                 {/* Re-use filter logic for mobile if needed */}
                 <p className="text-sm text-slate-500 italic">Filter options are available in the sidebar on desktop.</p>
                 <button 
                  onClick={() => setShowFilters(false)}
                  className="w-full rounded-xl bg-blue-600 py-4 font-bold text-white"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
