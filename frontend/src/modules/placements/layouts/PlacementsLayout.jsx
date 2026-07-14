import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../components/ui/Button';
import Navbar from '../../../components/Navbar';
import { LogOut, User, Search, LayoutDashboard, BarChart3, FileText } from 'lucide-react';

export function PlacementsLayout({ children = null } = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/placements', icon: LayoutDashboard },
    { name: 'Companies', path: '/placements/companies', icon: Search },
    ...(user ? [
      { name: 'My Experiences', path: '/placements/my-experiences', icon: FileText },
      { name: 'Analytics', path: '/placements/analytics', icon: BarChart3 },
    ] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream/30">
      <Navbar />
      <nav className="sticky top-16 z-40 w-full border-b border-brand-teal/10 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/placements" className="flex items-center space-x-2">
            <span className="text-2xl font-bold font-outfit text-brand-teal tracking-tight">
              University<span className="text-brand-teal/60">Prep</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-brand-teal text-white' 
                      : 'text-brand-teal/70 hover:text-brand-teal hover:bg-brand-teal/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <Link to="/placements/submit">
                  <Button variant="primary" size="sm" className="hidden sm:inline-flex">
                    Share Experience
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children || <Outlet />}
      </main>
      
      <footer className="border-t border-brand-teal/10 bg-white py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-brand-teal/60 text-sm">
          <p>© {new Date().getFullYear()} University Placement Prep. A crowdsourced repository.</p>
        </div>
      </footer>
    </div>
  );
}
