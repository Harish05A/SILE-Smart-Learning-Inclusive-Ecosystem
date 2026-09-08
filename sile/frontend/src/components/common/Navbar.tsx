import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AccessibilityToolbar } from './AccessibilityToolbar';
import { Button } from '../ui/Button';
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react';




interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav
      className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs"
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Left: Mobile Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <Link
              to={isAuthenticated ? '/dashboard' : '/'}
              className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl p-1"
            >
              <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm group-hover:bg-brand-700 transition-colors">
                S
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
                  SILE
                </span>
                <span className="text-[10px] font-semibold text-brand-600 tracking-wider uppercase">
                  Inclusive Learning
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Accessibility Toolbar & Account Menu */}
          <div className="flex items-center gap-3 sm:gap-4">
            <AccessibilityToolbar />

            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    title="View Learner Profile"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    <span className="hidden sm:inline max-w-[120px] truncate">
                      {user.learner_profile?.full_name || user.email.split('@')[0]}
                    </span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    title="Sign Out"
                    aria-label="Sign out of account"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="primary" size="sm">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
