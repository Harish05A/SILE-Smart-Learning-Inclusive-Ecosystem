import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Academic Capstone Project &bull; Phase 1
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Smart Inclusive <br />
              <span className="text-indigo-600">Learning Ecosystem</span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              SILE provides personalized, cognitive-aware learning experiences for diverse learners,
              students with varied pacing needs, and individuals requiring customized accessibility
              support.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg">Go to Learner Dashboard &rarr;</Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg">Get Started with Baseline Assessment</Button>
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
          <h2 className="text-2xl font-bold text-slate-900">Foundational Principles</h2>
          <p className="text-sm text-slate-500 mt-2">
            Engineered from the ground up for cognitive diversity, accessibility, and modular intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="hover:border-indigo-200 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cognitive Baseline Diagnostic</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Establishes each learner's foundational readiness across logic, comprehension, and subject
              domains without rigid time constraints.
            </p>
          </Card>

          <Card className="hover:border-indigo-200 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Inclusive Sensory Adaptations</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Native real-time support for dyslexia-friendly typography, high-contrast modes, dynamic text
              scaling, and reduced visual clutter.
            </p>
          </Card>

          <Card className="hover:border-indigo-200 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Multi-Modal Preferences</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Configurable delivery modes supporting visual explanations, step-by-step guidance,
              simplified language, and personalized pacing.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-2 sm:space-y-0">
          <span>&copy; SILE &mdash; Smart Inclusive Learning Ecosystem</span>
          <span>Semester 7 Capstone Project</span>
        </div>
      </footer>
    </div>
  );
};
