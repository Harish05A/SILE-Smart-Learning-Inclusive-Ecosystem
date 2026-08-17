import React, { createContext, useState, useEffect, useCallback } from 'react';

interface AccessibilityContextType {
  fontSizePercent: number; // 90 to 140
  highContrast: boolean;
  textToSpeechEnabled: boolean;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  toggleHighContrast: () => void;
  toggleTextToSpeech: () => void;
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

  const toggleTextToSpeech = () => {
    setTextToSpeechEnabled((prev) => {
      const next = !prev;
      if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
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
        textToSpeechEnabled,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
        toggleHighContrast,
        toggleTextToSpeech,
        speakText,
        stopSpeaking,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};
