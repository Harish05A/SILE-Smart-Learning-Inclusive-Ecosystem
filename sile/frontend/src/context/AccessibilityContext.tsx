import React, { createContext, useState, useEffect, useCallback } from 'react';

export interface AccessibilityContextType {
  fontSizePercent: number; // 90 to 140
  highContrast: boolean;
  dyslexiaFont: boolean;
  reducedMotion: boolean;
  textToSpeechEnabled: boolean;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  toggleHighContrast: () => void;
  toggleDyslexiaFont: () => void;
  toggleReducedMotion: () => void;
  toggleTextToSpeech: () => void;
  resetToDefaults: () => void;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
}

export const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSizePercent, setFontSizePercent] = useState<number>(() => {
    const saved = localStorage.getItem('sile_a11y_font_size');
    return saved ? parseInt(saved, 10) : 100;
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('sile_a11y_high_contrast') === 'true';
  });

  const [dyslexiaFont, setDyslexiaFont] = useState<boolean>(() => {
    return localStorage.getItem('sile_a11y_dyslexia') === 'true';
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem('sile_a11y_reduced_motion') === 'true';
  });

  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState<boolean>(() => {
    return localStorage.getItem('sile_a11y_tts') === 'true';
  });

  // Apply DOM modifications dynamically
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--font-scale', `${fontSizePercent}%`);
    localStorage.setItem('sile_a11y_font_size', String(fontSizePercent));
  }, [fontSizePercent]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-high-contrast', highContrast);
    localStorage.setItem('sile_a11y_high_contrast', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('sile-dyslexia', dyslexiaFont);
    localStorage.setItem('sile_a11y_dyslexia', String(dyslexiaFont));
  }, [dyslexiaFont]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('reduce-motion', reducedMotion);
    localStorage.setItem('sile_a11y_reduced_motion', String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem('sile_a11y_tts', String(textToSpeechEnabled));
  }, [textToSpeechEnabled]);

  const increaseFontSize = () => {
    setFontSizePercent((prev) => Math.min(prev + 10, 140));
  };

  const decreaseFontSize = () => {
    setFontSizePercent((prev) => Math.max(prev - 10, 90));
  };

  const resetFontSize = () => {
    setFontSizePercent(100);
  };

  const toggleHighContrast = () => {
    setHighContrast((prev) => !prev);
  };

  const toggleDyslexiaFont = () => {
    setDyslexiaFont((prev) => !prev);
  };

  const toggleReducedMotion = () => {
    setReducedMotion((prev) => !prev);
  };

  const toggleTextToSpeech = () => {
    setTextToSpeechEnabled((prev) => {
      const next = !prev;
      if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  const resetToDefaults = () => {
    setFontSizePercent(100);
    setHighContrast(false);
    setDyslexiaFont(false);
    setReducedMotion(false);
    setTextToSpeechEnabled(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakText = useCallback(
    (text: string) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/<[^>]*>?/gm, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    },
    []
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        fontSizePercent,
        highContrast,
        dyslexiaFont,
        reducedMotion,
        textToSpeechEnabled,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
        toggleHighContrast,
        toggleDyslexiaFont,
        toggleReducedMotion,
        toggleTextToSpeech,
        resetToDefaults,
        speakText,
        stopSpeaking,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};
