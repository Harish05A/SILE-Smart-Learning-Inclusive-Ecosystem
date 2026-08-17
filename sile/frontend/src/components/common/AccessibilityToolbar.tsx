import React from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';

export const AccessibilityToolbar: React.FC = () => {
  const {
    fontSizePercent,
    highContrast,
    textToSpeechEnabled,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
    toggleHighContrast,
    toggleTextToSpeech,
  } = useAccessibility();

  return (
    <div
      className="inline-flex items-center space-x-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200"
      role="toolbar"
      aria-label="Accessibility quick controls"
    >
      {/* Decrease Text Size */}
      <button
        type="button"
        onClick={decreaseFontSize}
        className="px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white hover:text-indigo-600 rounded transition-colors focus-visible:ring-2 focus-visible:ring-indigo-600"
        title="Decrease text size"
        aria-label="Decrease text size"
      >
        A-
      </button>

      {/* Font Size Indicator / Reset */}
      <button
        type="button"
        onClick={resetFontSize}
        className="px-1.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-white hover:text-slate-900 rounded transition-colors"
        title="Reset text size to standard 100%"
        aria-label={`Current font size scale is ${fontSizePercent} percent. Click to reset.`}
      >
        {fontSizePercent}%
      </button>

      {/* Increase Text Size */}
      <button
        type="button"
        onClick={increaseFontSize}
        className="px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white hover:text-indigo-600 rounded transition-colors focus-visible:ring-2 focus-visible:ring-indigo-600"
        title="Increase text size"
        aria-label="Increase text size"
      >
        A+
      </button>

      <span className="h-4 w-px bg-slate-300 mx-1" aria-hidden="true" />

      {/* High Contrast Mode Toggle */}
      <button
        type="button"
        onClick={toggleHighContrast}
        className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center space-x-1 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-600 ${
          highContrast
            ? 'bg-slate-900 text-yellow-300 font-bold border border-yellow-300'
            : 'text-slate-700 hover:bg-white hover:text-indigo-600'
        }`}
        aria-pressed={highContrast}
        title="Toggle high contrast visual mode"
        aria-label="Toggle high contrast mode"
      >
        <span aria-hidden="true">◐</span>
        <span>Contrast</span>
      </button>

      {/* Text-to-Speech Readiness Indicator */}
      <button
        type="button"
        onClick={toggleTextToSpeech}
        className={`hidden sm:inline-flex px-2 py-1 text-xs font-semibold rounded items-center space-x-1 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-600 ${
          textToSpeechEnabled
            ? 'bg-indigo-600 text-white font-bold'
            : 'text-slate-700 hover:bg-white hover:text-indigo-600'
        }`}
        aria-pressed={textToSpeechEnabled}
        title="Toggle read aloud speech support"
        aria-label="Toggle text to speech support"
      >
        <span aria-hidden="true">🔊</span>
        <span>TTS</span>
      </button>
    </div>
  );
};
