import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle className="h-12 w-12" />
      </div>
      <h2 className="mb-2 text-3xl font-bold text-slate-900">Page Not Found</h2>
      <p className="mb-8 text-slate-500 max-w-md">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link 
        to="/" 
        className="flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3 font-bold text-white transition-all hover:bg-blue-700 shadow-lg shadow-blue-200"
      >
        <Home className="h-5 w-5" />
        Back to Home
      </Link>
    </div>
  );
}
