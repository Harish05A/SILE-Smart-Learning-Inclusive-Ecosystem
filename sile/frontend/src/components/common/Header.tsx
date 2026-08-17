import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AccessibilityToolbar } from './AccessibilityToolbar';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
            S
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">SILE</span>
          <span className="hidden md:inline-block text-xs uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
            Inclusive Learning
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <AccessibilityToolbar />
          {user && (
            <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
              <span className="text-sm font-medium text-slate-700">
                {user.learner_profile?.full_name || user.email}
              </span>
              <button
                onClick={logout}
                className="text-xs text-slate-500 hover:text-red-600 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
