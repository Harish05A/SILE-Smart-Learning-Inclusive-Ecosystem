import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Compass,
  BookOpen,
  Zap,
  BarChart2,
  Lightbulb,
  Sparkles,
  Scale,
  User,
  Sliders,
  CheckSquare,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const learnLinks = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Explore Curriculum', path: '/topics', icon: Compass },
    { name: 'My Learning Path', path: '/learning-path', icon: BookOpen },
    { name: 'Adaptive Practice', path: '/practice', icon: Zap },
  ];

  const understandLinks = [
    { name: 'Progress & Mastery', path: '/performance', icon: BarChart2 },
    { name: 'Recommendations', path: '/recommendations', icon: Lightbulb },
    { name: 'Research & Evaluation', path: '/evaluation', icon: Scale },
  ];

  const aiLinks = [
    { name: 'AI Adaptive Tutor', path: '/ai-tutor', icon: Sparkles, badge: 'Phase 3' },
  ];

  const accountLinks = [
    { name: 'Diagnostic Baseline', path: '/assessment', icon: CheckSquare },
    { name: 'Learner Profile', path: '/profile', icon: User },
    { name: 'Accessibility Settings', path: '/preferences', icon: Sliders },
  ];

  const renderNavGroup = (title: string, links: typeof learnLinks) => (
    <div className="mb-6 last:mb-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
        {title}
      </div>
      <nav className="space-y-0.5" aria-label={title}>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                  isActive
                    ? 'bg-brand-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 flex-shrink-0 opacity-80 group-hover:opacity-100" aria-hidden="true" />
                <span className="truncate">{link.name}</span>
              </div>
              {'badge' in link && (link as { badge?: string }).badge && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-brand-400/20 text-brand-200 border border-brand-300/30">
                  {(link as { badge?: string }).badge}
                </span>
              )}
            </NavLink>
          );
        })}


      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 left-0 h-screen lg:h-[calc(100vh-4rem)] w-64 bg-slate-900 text-slate-200 p-4 flex flex-col justify-between z-50 lg:z-10 transition-transform duration-200 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="space-y-1">
          {/* Mobile close button */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation</span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {renderNavGroup('Learn', learnLinks)}
          {renderNavGroup('AI Support', aiLinks)}
          {renderNavGroup('Understand', understandLinks)}
          {renderNavGroup('Account & Baseline', accountLinks)}
        </div>

        {/* Footer info pill */}
        <div className="pt-4 mt-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs text-slate-400">
            <p className="font-semibold text-brand-300">SILE Intelligence</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Adaptive Multi-Agent Ecosystem</p>
          </div>
        </div>
      </aside>
    </>
  );
};
