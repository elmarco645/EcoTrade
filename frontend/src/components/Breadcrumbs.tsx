import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';

interface BreadcrumbsProps {
  user?: any;
}

export default function Breadcrumbs({ user }: BreadcrumbsProps) {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Hide on landing page if not logged in
  if (location.pathname === '/' && !user) return null;

  const breadcrumbMap: Record<string, string> = {
    'marketplace': 'Marketplace',
    'listing': 'Marketplace', // Map 'listing' parent to Marketplace
    'cart': 'Shopping Cart',
    'create-listing': 'New Listing',
    'profile': 'My Profile',
    'wallet': 'My Wallet',
    'chat': 'Messages',
    'login': 'Sign In',
    'register': 'Create Account',
  };

  const routeOverrides: Record<string, string> = {
    '/listing': '/marketplace',
  };

  // Logic to collapse long paths on mobile
  const maxVisibleItems = 3;
  const shouldCollapse = pathnames.length > maxVisibleItems;

  return (
    <nav className="bg-white border-b border-slate-200/60 py-2.5 shadow-sm sticky top-16 z-40">
      <div className="container mx-auto px-4">
        <ol className="flex items-center space-x-1.5 text-xs font-medium text-slate-500">
          <li className="flex items-center">
            <Link 
              to="/" 
              className={`flex items-center gap-1.5 transition-colors py-1 ${
                location.pathname === '/' ? 'text-slate-900 font-semibold' : 'hover:text-blue-600'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
          </li>
          
          {pathnames.length > 0 && (
            <>
              {shouldCollapse ? (
                <li className="flex items-center">
                  <ChevronRight className="h-3.5 w-3.5 mx-0.5 text-slate-300 shrink-0" />
                  <div className="flex items-center gap-1 px-1 py-1 bg-slate-50 rounded text-slate-400">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 mx-0.5 text-slate-300 shrink-0" />
                  {/* Show only the last two items if collapsed */}
                  {pathnames.slice(-2).map((value, index) => {
                    const actualIndex = pathnames.length - 2 + index;
                    const last = actualIndex === pathnames.length - 1;
                    let to = `/${pathnames.slice(0, actualIndex + 1).join('/')}`;
                    
                    // Apply route overrides
                    if (routeOverrides[to]) {
                      to = routeOverrides[to];
                    }
                    
                    const isId = /^[0-9a-fA-F-]+$/.test(value) || !isNaN(Number(value));
                    const label = isId ? 'Details' : (breadcrumbMap[value] || value.charAt(0).toUpperCase() + value.slice(1));

                    return (
                      <div key={to} className="flex items-center">
                        {index > 0 && <ChevronRight className="h-3.5 w-3.5 mx-0.5 text-slate-300 shrink-0" />}
                        {last ? (
                          <span className="font-semibold text-slate-900 truncate max-w-[120px] sm:max-w-none py-1">
                            {label}
                          </span>
                        ) : (
                          <Link 
                            to={to} 
                            className="hover:text-blue-600 transition-colors whitespace-nowrap py-1"
                          >
                            {label}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </li>
              ) : (
                pathnames.map((value, index) => {
                  const last = index === pathnames.length - 1;
                  let to = `/${pathnames.slice(0, index + 1).join('/')}`;
                  
                  // Apply route overrides
                  if (routeOverrides[to]) {
                    to = routeOverrides[to];
                  }
                  
                  const isId = /^[0-9a-fA-F-]+$/.test(value) || !isNaN(Number(value));
                  const label = isId ? 'Details' : (breadcrumbMap[value] || value.charAt(0).toUpperCase() + value.slice(1));

                  return (
                    <li key={to} className="flex items-center">
                      <ChevronRight className="h-3.5 w-3.5 mx-0.5 text-slate-300 shrink-0" />
                      {last ? (
                        <span className="font-semibold text-slate-900 truncate max-w-[150px] sm:max-w-none py-1">
                          {label}
                        </span>
                      ) : (
                        <Link 
                          to={to} 
                          className="hover:text-blue-600 transition-colors whitespace-nowrap py-1"
                        >
                          {label}
                        </Link>
                      )}
                    </li>
                  );
                })
              )}
            </>
          )}
        </ol>
      </div>
    </nav>
  );
}
