import React from 'react';
import { NavLink } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const mainLinks = [
    { name: 'Learning Home', path: '/dashboard', icon: '🏠' },
    { name: 'Adaptive Practice', path: '/practice', icon: '⚡' },
    { name: 'My Learning Path', path: '/learning-path', icon: '🗺️' },
    { name: 'Recommendations', path: '/recommendations', icon: '💡' },
    { name: 'Curriculum Topics', path: '/topics', icon: '📚' },
    { name: 'Topic Performance', path: '/performance', icon: '📊' },
  ];

  const foundationLinks = [
    { name: 'Baseline Assessment', path: '/assessment', icon: '📝' },
    { name: 'Learner Profile', path: '/profile', icon: '👤' },
    { name: 'Preferences', path: '/preferences', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex-shrink-0 min-h-screen p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-indigo-400 font-bold px-3 mb-2">
            Adaptive Learning Engine
          </div>
          <nav className="space-y-1">
            {mainLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <span className="text-base">{link.icon}</span>
                <span>{link.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold px-3 mb-2">
            Profile & Baseline
          </div>
          <nav className="space-y-1">
            {foundationLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <span className="text-base">{link.icon}</span>
                <span>{link.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-3 bg-slate-800/80 border border-slate-700/50 rounded-xl text-xs text-slate-400 mt-4">
        <p className="font-bold text-indigo-300">Phase 2 Active</p>
        <p className="text-[11px] mt-0.5 text-slate-400">Rule-Based Adaptive Learning</p>
      </div>
    </aside>
  );
};
