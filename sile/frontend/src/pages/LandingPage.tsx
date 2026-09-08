import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Human-Centered Inclusive Learning
              </span>
              <Badge variant="brand" size="sm">SILE Platform</Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-surface-900 dark:text-white tracking-tight leading-tight">
              Smart Inclusive <br />
              <span className="text-brand-600 dark:text-brand-400">Learning Ecosystem</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-surface-600 dark:text-surface-300 leading-relaxed">
              SILE understands how you learn best. By combining deterministic mastery models with collaborative 
              multi-agent intelligence, SILE provides calm, accessible, and progressive educational guidance.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg" variant="primary">Go to Learner Dashboard →</Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" variant="primary">Start Learning Journey</Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Foundational Principles</h2>
          <p className="text-sm text-surface-600 dark:text-surface-400 mt-2">
            Engineered from the ground up for cognitive diversity, WCAG accessibility, and multi-agent explainability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card variant="default" className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-base border border-brand-200 dark:border-brand-800/60">
              1
            </div>
            <h3 className="text-lg font-bold text-surface-900 dark:text-white">Diagnostic Calibration</h3>
            <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
              Untimed, supportive baseline assessment establishing foundational readiness across subject domains
              without punitive or clinical labeling.
            </p>
          </Card>

          <Card variant="default" className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-base border border-brand-200 dark:border-brand-800/60">
              2
            </div>
            <h3 className="text-lg font-bold text-surface-900 dark:text-white">Accessibility by Design</h3>
            <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
              Native real-time support for dyslexia-friendly typography, high-contrast modes, dynamic text
              scaling, and focused study mode.
            </p>
          </Card>

          <Card variant="default" className="p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-base border border-brand-200 dark:border-brand-800/60">
              3
            </div>
            <h3 className="text-lg font-bold text-surface-900 dark:text-white">Multi-Agent AI Companion</h3>
            <p className="text-xs sm:text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
              Collaborative agent architecture synthesizing tailored explanations, worked examples, and formative 
              checkpoints with full research explainability.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-surface-500 space-y-2 sm:space-y-0">
          <span>&copy; SILE &mdash; Smart Inclusive Learning Ecosystem</span>
          <span>Capstone Research Project &bull; Semester 7</span>
        </div>
      </footer>
    </div>
  );
};
