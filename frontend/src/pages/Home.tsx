import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, Zap, Leaf } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden rounded-[3rem] bg-blue-600 px-6 py-24 text-center text-white md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-3xl"
        >
          <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
            The sustainable way to shop and sell.
          </h1>
          <p className="mt-6 text-lg text-blue-100 md:text-xl">
            EcoTrade is the secure marketplace for pre-loved items. Join thousands of users making a difference while saving money.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/marketplace"
              className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-blue-600 transition-all hover:scale-105 hover:bg-blue-50"
            >
              Start Shopping
            </Link>
            <Link
              to="/register"
              className="rounded-full border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Join EcoTrade
            </Link>
          </div>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />
      </section>

      {/* Features */}
      <section className="grid gap-12 md:grid-cols-3">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold">Secure Escrow</h3>
          <p className="mt-2 text-slate-600">
            Your money is held safely until you confirm you've received the item exactly as described.
          </p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <Leaf className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold">Eco-Friendly</h3>
          <p className="mt-2 text-slate-600">
            Reduce waste and carbon footprint by giving pre-loved items a second life.
          </p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Zap className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold">Fast & Easy</h3>
          <p className="mt-2 text-slate-600">
            List your items in seconds and chat directly with buyers through our real-time system.
          </p>
        </div>
      </section>

      {/* Categories / CTA */}
      <section className="rounded-[3rem] bg-slate-900 p-12 text-white md:p-20">
        <div className="flex flex-col items-center justify-between gap-12 md:flex-row">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold md:text-5xl">Ready to clear out your closet?</h2>
            <p className="mt-6 text-lg text-slate-400">
              Turn your unused items into cash today. Our seller tools make it easy to manage listings and get paid securely.
            </p>
            <Link
              to="/create-listing"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold transition-all hover:bg-blue-700"
            >
              Start Selling <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 w-48 rounded-3xl bg-slate-800 p-6 transition-all hover:bg-slate-700">
              <span className="text-sm font-medium text-slate-500">01</span>
              <h4 className="mt-4 text-xl font-bold">Fashion</h4>
            </div>
            <div className="mt-8 h-48 w-48 rounded-3xl bg-blue-600 p-6 transition-all hover:bg-blue-500">
              <span className="text-sm font-medium text-blue-200">02</span>
              <h4 className="mt-4 text-xl font-bold">Tech</h4>
            </div>
            <div className="-mt-8 h-48 w-48 rounded-3xl bg-slate-800 p-6 transition-all hover:bg-slate-700">
              <span className="text-sm font-medium text-slate-500">03</span>
              <h4 className="mt-4 text-xl font-bold">Home</h4>
            </div>
            <div className="h-48 w-48 rounded-3xl bg-slate-800 p-6 transition-all hover:bg-slate-700">
              <span className="text-sm font-medium text-slate-500">04</span>
              <h4 className="mt-4 text-xl font-bold">Books</h4>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
