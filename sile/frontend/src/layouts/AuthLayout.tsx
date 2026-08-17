import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { AccessibilityToolbar } from '../components/common/AccessibilityToolbar';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 left-4">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          &larr; Back to Home
        </Link>
      </div>

      <div className="absolute top-4 right-4">
        <AccessibilityToolbar />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex flex-col items-center group focus:outline-none">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-sm group-hover:bg-indigo-700 transition-colors">
            S
          </div>
          <h2 className="mt-3 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            SILE
          </h2>
        </Link>
        <p className="mt-1 text-center text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Smart Inclusive Learning Ecosystem
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200 sm:rounded-xl sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
