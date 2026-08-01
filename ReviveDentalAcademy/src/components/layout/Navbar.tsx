import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, ChevronDown, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, profile, signOut } = useAuthStore();
  
  const navLinks = [
    { name: 'Training', href: '/training' },
    { name: 'Courses', href: '/courses' },
    { name: 'Templates', href: '/templates' },
    { name: 'Resources', href: '/resources' },
    { name: 'Office Pro', href: '/membership', pro: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-primary/95 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex flex-col group">
              <span className="text-white font-bold text-2xl tracking-tight leading-none group-hover:text-secondary transition-colors">Revive</span>
              <span className="text-secondary text-[10px] uppercase tracking-[0.2em] font-medium font-sans">Dental Academy</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`text-sm font-medium tracking-wide transition-all duration-200 flex items-center gap-1.5 ${
                  isActive(link.href) 
                    ? 'text-secondary' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {link.pro && <Lock className="h-3 w-3 text-secondary/50" />}
                {link.name}
              </Link>
            ))}
            
            <div className="h-4 w-[1px] bg-white/10 mx-2" />

            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 text-sm font-medium text-white hover:text-secondary transition-colors">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
                    <User className="h-4 w-4 text-secondary" />
                  </div>
                  <span>{profile?.full_name?.split(' ')[0] || 'Member'}</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
                
                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-[#1A1F26] border border-white/10 rounded-lg shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link to="/membership" className="block px-4 py-2 text-sm text-gray-300 hover:bg-secondary/10 hover:text-secondary transition-colors">Dashboard</Link>
                  <Link to="/courses" className="block px-4 py-2 text-sm text-gray-300 hover:bg-secondary/10 hover:text-secondary transition-colors">My Courses</Link>
                  {profile?.role === 'admin' && (
                    <Link to="/admin" className="block px-4 py-2 text-sm text-brand-mint hover:bg-brand-mint/10 transition-colors">Admin Dashboard</Link>
                  )}
                  <div className="h-[1px] bg-white/5 my-2" />
                  <button 
                    onClick={signOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-glow bg-secondary text-primary px-7 py-2.5 rounded-full text-sm font-semibold tracking-wide"
              >
                Unlock Office Pro
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-400 hover:text-white p-2"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-primary border-b border-white/5 animate-in slide-in-from-top duration-300">
          <div className="px-4 pt-4 pb-8 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`block py-2 text-base font-medium ${
                  isActive(link.href) ? 'text-secondary' : 'text-gray-300'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/5">
              {isAuthenticated ? (
                <button
                  onClick={() => { signOut(); setIsOpen(false); }}
                  className="w-full text-left py-2 text-base font-medium text-red-400"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  className="block py-3 text-center bg-secondary text-primary rounded-lg font-semibold"
                  onClick={() => setIsOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
