import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main
          id="main-content"
          className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
