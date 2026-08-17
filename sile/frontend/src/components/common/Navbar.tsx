import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AccessibilityToolbar } from './AccessibilityToolbar';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group focus:outline-none">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-xs group-hover:bg-indigo-700 transition-colors">
              S
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                SILE
              </span>
              <span className="text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">
                Inclusive Learning
              </span>
            </div>
          </Link>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-4">
            <AccessibilityToolbar />

            <div className="hidden sm:flex items-center space-x-2 border-l border-slate-200 pl-4">
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                    {user.learner_profile?.full_name || user.email}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
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
