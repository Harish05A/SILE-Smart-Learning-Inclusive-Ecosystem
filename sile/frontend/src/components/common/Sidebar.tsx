import React from 'react';
import { NavLink } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const links = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Baseline Assessment', path: '/assessment' },
    { name: 'Profile', path: '/profile' },
    { name: 'Preferences', path: '/preferences' },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex-shrink-0 min-h-screen p-4 flex flex-col justify-between">
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold px-3 mb-4">
          Learner Navigation
        </div>
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-3 bg-slate-800 rounded-lg text-xs text-slate-400">
        <p className="font-semibold text-slate-300">Phase 1 Foundation</p>
        <p className="mt-1">Inclusive Adaptive Baseline</p>
      </div>
    </aside>
  );
};
