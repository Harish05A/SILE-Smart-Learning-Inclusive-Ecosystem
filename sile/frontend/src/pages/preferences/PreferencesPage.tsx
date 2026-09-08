import React from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const PreferencesPage: React.FC = () => {
  const {
    highContrast,
    toggleHighContrast,
    dyslexiaFont,
    toggleDyslexiaFont,
    reducedMotion,
    toggleReducedMotion,
    fontSizePercent,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    textToSpeechEnabled,
    toggleTextToSpeech,
    resetToDefaults,
  } = useAccessibility();

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="border-b border-surface-200 dark:border-surface-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            Interface Accommodations
          </span>
          <Badge variant="brand" size="sm">Accessibility Center</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
          Learning & Accessibility Preferences
        </h1>
        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
          Customize sensory display options, typography styles, and assistive tools across the entire platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Typography & Readability */}
        <Card variant="default" className="p-6 space-y-4">
          <h2 className="text-base font-bold text-surface-900 dark:text-white">Typography & Readability</h2>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300">
                  Font Size Scaling
                </label>
                <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                  {fontSizePercent}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={decreaseFontSize} disabled={fontSizePercent <= 90}>
                  A- (Smaller)
                </Button>
                <Button variant="outline" size="sm" onClick={resetFontSize}>
                  100% Reset
                </Button>
                <Button variant="secondary" size="sm" onClick={increaseFontSize} disabled={fontSizePercent >= 140}>
                  A+ (Larger)
                </Button>
              </div>
            </div>

            <label className="flex items-start space-x-3 p-3 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={dyslexiaFont}
                onChange={toggleDyslexiaFont}
                className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Dyslexia-Friendly Font</span>
                <span className="text-surface-500">Enable high-legibility OpenDyslexic / clean sans typography.</span>
              </div>
            </label>
          </div>
        </Card>

        {/* Sensory & Contrast */}
        <Card variant="default" className="p-6 space-y-4">
          <h2 className="text-base font-bold text-surface-900 dark:text-white">Sensory & Contrast</h2>
          
          <div className="space-y-3">
            <label className="flex items-start space-x-3 p-3 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={toggleHighContrast}
                className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">High-Contrast Mode</span>
                <span className="text-surface-500">Enforce maximum color contrast and crisp border definitions.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={toggleReducedMotion}
                className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Reduce Motion & Animations</span>
                <span className="text-surface-500">Disable transitions, shimmer animations, and layout movements.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={textToSpeechEnabled}
                onChange={toggleTextToSpeech}
                className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Text-to-Speech (TTS) Narrator</span>
                <span className="text-surface-500">Activate automatic voice read-aloud on lesson checkpoints.</span>
              </div>
            </label>
          </div>
        </Card>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-surface-800">
        <Button variant="outline" size="sm" onClick={resetToDefaults}>
          Reset Interface Defaults
        </Button>
      </div>
    </div>
  );
};
