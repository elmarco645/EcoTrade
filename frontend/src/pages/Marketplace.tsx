import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MapPin, Tag, Star, X, ChevronDown, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  'Electronics', 'Phones & Tablets', 'Computers & Laptops', 'Fashion', 
  'Home & Furniture', 'Vehicles', 'Gaming', 'Appliances', 'Books', 
  'Beauty & Health', 'Sports', 'Other'
];

const CONDITIONS = ['New', 'Like New', 'Used - Good', 'Used - Fair', 'Refurbished'];

const LOCATIONS = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Thika'];

export default function Marketplace() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => {
        setListings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching listings:', err);
        setLoading(false);
      });
  }, []);

  const filteredListings = listings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
                         l.category.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = !filters.category || l.category === filters.category;
    const matchesCondition = !filters.condition || l.condition === filters.condition;
    const matchesLocation = !filters.location || l.location === filters.location;
    const matchesMinPrice = !filters.minPrice || l.price >= Number(filters.minPrice);
    const matchesMaxPrice = !filters.maxPrice || l.price <= Number(filters.maxPrice);
    const matchesNegotiable = !filters.isNegotiable || l.is_negotiable === 1;

    return matchesSearch && matchesCategory && matchesCondition && 
           matchesLocation && matchesMinPrice && matchesMaxPrice && matchesNegotiable;
  });

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
    <div className="flex flex-col gap-10 lg:flex-row pb-20">
      {/* Sidebar Filters - Desktop */}
      <aside className="hidden w-72 shrink-0 space-y-8 lg:block">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary-500" />
            Filters
          </h2>
          {activeFilterCount > 0 && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={resetFilters}
              className="text-xs font-black text-primary-500 hover:text-primary-600 transition-colors uppercase tracking-widest"
            >
              Reset All
            </motion.button>
          )}
        </div>

        <div className="space-y-8 glass p-6 rounded-3xl">
          {/* Category */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</h3>
            <div className="space-y-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilters(f => ({ ...f, category: f.category === cat ? '' : cat }))}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                    filters.category === cat ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-slate-600 hover:bg-surface-100'
                  }`}
                >
                  {cat}
                  {filters.category === cat && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-surface-200" />

          {/* Price Range */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Price Range</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                  className="w-full rounded-xl border border-surface-200 bg-surface-50 pl-7 pr-3 py-2 text-sm font-bold outline-none focus:border-primary-500 focus:bg-white transition-all"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                  className="w-full rounded-xl border border-surface-200 bg-surface-50 pl-7 pr-3 py-2 text-sm font-bold outline-none focus:border-primary-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <hr className="border-surface-200" />

          {/* Condition */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Condition</h3>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(cond => (
                <button
                  key={cond}
                  onClick={() => setFilters(f => ({ ...f, condition: f.condition === cond ? '' : cond }))}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    filters.condition === cond 
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                      : 'bg-surface-100 text-slate-600 hover:bg-surface-200'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Negotiable */}
          <label className="flex cursor-pointer items-center gap-3 p-1">
            <div className="relative flex h-6 w-6 items-center justify-center">
              <input
                type="checkbox"
                checked={filters.isNegotiable}
                onChange={(e) => setFilters(f => ({ ...f, isNegotiable: e.target.checked }))}
                className="peer h-full w-full appearance-none rounded-lg border-2 border-surface-200 bg-white checked:bg-primary-500 checked:border-primary-500 transition-all cursor-pointer"
              />
              <Check className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
            <span className="text-sm font-bold text-slate-700">Negotiable only</span>
          </label>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-500">
              <Sparkles className="h-3 w-3" />
              Community Marketplace
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Explore Items</h1>
            <p className="text-sm font-medium text-slate-500">
              Showing <span className="text-slate-900 font-bold">{filteredListings.length}</span> sustainable choice{filteredListings.length !== 1 ? 's' : ''} for you.
            </p>
          </div>
          <div className="flex w-full items-center gap-4 md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-2xl border border-surface-200 bg-white pl-12 pr-4 text-sm font-medium shadow-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all"
              />
            </div>
            <button 
              onClick={() => setShowFilters(true)}
              className="relative flex h-12 items-center gap-2 rounded-2xl border border-surface-200 bg-white px-5 font-bold text-slate-700 hover:bg-surface-50 transition-colors lg:hidden"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] font-black text-white shadow-lg shadow-primary-500/30">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilters(false)}
                className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md lg:hidden"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 z-[70] w-full max-w-sm bg-white p-8 shadow-2xl lg:hidden"
              >
                <div className="flex items-center justify-between mb-10">
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-black tracking-tight">Filters</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Refine your results</p>
                  </div>
                  <button 
                    onClick={() => setShowFilters(false)} 
                    aria-label="Close filters"
                    title="Close filters"
                    className="rounded-2xl p-3 bg-surface-100 hover:bg-surface-200 transition-colors"
                  >
                    <X className="h-6 w-6 text-slate-600" />
                  </button>
                </div>

                <div className="h-[calc(100vh-14rem)] overflow-y-auto space-y-10 pr-2 pb-10">
                  {/* Category */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setFilters(f => ({ ...f, category: f.category === cat ? '' : cat }))}
                          className={`rounded-xl border-2 px-3 py-3 text-xs font-bold transition-all text-center ${
                            filters.category === cat 
                              ? 'border-primary-500 bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                              : 'border-surface-200 text-slate-600 hover:bg-surface-50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Price Range</h3>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                        className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-bold outline-none focus:border-primary-500"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                        className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-bold outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Condition */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Condition</h3>
                    <div className="flex flex-wrap gap-2">
                      {CONDITIONS.map(cond => (
                        <button
                          key={cond}
                          onClick={() => setFilters(f => ({ ...f, condition: f.condition === cond ? '' : cond }))}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                            filters.condition === cond 
                              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                              : 'bg-surface-100 text-slate-600'
                          }`}
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 border-t border-surface-100 bg-white p-6">
                  <div className="flex gap-4">
                    <button 
                      onClick={resetFilters}
                      className="flex-1 rounded-2xl bg-surface-100 py-4 font-black text-slate-600 transition-colors hover:bg-surface-200"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={() => setShowFilters(false)}
                      className="flex-[2] btn-primary py-4 font-black"
                    >
                      Show Results
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse space-y-6">
                <div className="aspect-square rounded-[2.5rem] bg-surface-200" />
                <div className="space-y-3 px-2">
                  <div className="h-4 w-1/4 rounded-full bg-surface-200" />
                  <div className="h-5 w-2/3 rounded-full bg-surface-200" />
                  <div className="h-6 w-1/3 rounded-full bg-surface-200" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border border-surface-200 shadow-sm"
          >
            <div className="mb-6 rounded-3xl bg-surface-50 p-8 text-slate-300">
              <Search size={64} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">No treasures found</h2>
            <p className="text-slate-500 font-medium max-w-xs mx-auto mt-2">
              We couldn't find matches for your current filters. Try relaxing your search criteria.
            </p>
            <button 
              onClick={resetFilters}
              className="mt-8 px-8 py-3 rounded-2xl bg-primary-50 text-primary-500 font-black hover:bg-primary-100 transition-colors uppercase tracking-widest text-xs"
            >
              Reset Filters
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredListings.map((listing, idx) => (
                <motion.div
                  key={listing.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    duration: 0.4,
                    delay: idx * 0.05,
                    type: 'spring',
                    damping: 20
                  }}
                >
                  <Link
                    to={`/listing/${listing.id}`}
                    className="group flex h-full flex-col space-y-5 rounded-[2.5rem] border border-surface-100 bg-white p-5 card-hover shadow-sm"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-surface-100">
                      <img
                        src={JSON.parse(listing.images || '[]')[0] || `https://picsum.photos/seed/${listing.id}/600/600`}
                        alt={listing.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute left-4 top-4 rounded-xl bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary-500 backdrop-blur-md shadow-sm">
                        {listing.condition}
                      </div>
                      {!!listing.is_negotiable && (
                        <div className="absolute right-4 top-4 rounded-xl bg-accent-500/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md shadow-sm shadow-accent-500/20">
                          Negotiable
                        </div>
                      )}
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl text-[10px] font-bold shadow-sm flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary-500" />
                            {listing.location}
                         </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 px-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{listing.category}</span>
                          {!!listing.is_seller_verified && (
                             <div className="relative group/verify">
                                <ShieldCheck className="h-4 w-4 text-primary-500 fill-primary-50" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-900 text-[8px] text-white rounded-lg opacity-0 group-hover/verify:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                  Verified Seller
                                </div>
                             </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs font-black text-amber-600">
                          <Star className="h-3 w-3 fill-current" />
                          {listing.seller_rating || 'New'}
                        </div>
                      </div>
                      <h3 className="line-clamp-2 text-lg font-black tracking-tight text-slate-900 group-hover:text-primary-500 transition-colors min-h-[3.5rem] leading-tight">
                        {listing.title}
                      </h3>
                      <div className="flex items-center justify-between pt-3 border-t border-surface-50">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Price</span>
                          <span className="text-2xl font-black text-slate-900">${listing.price}</span>
                        </div>
                        <motion.div 
                          whileHover={{ x: 5 }}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface-100 text-slate-600 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-sm"
                        >
                          <Sparkles className="h-5 w-5" />
                        </motion.div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
