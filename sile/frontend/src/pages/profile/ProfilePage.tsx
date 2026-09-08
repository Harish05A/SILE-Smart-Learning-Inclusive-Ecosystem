import React, { useEffect, useState } from 'react';
import { profileService } from '../../services/profile.service';
import { useAuth } from '../../hooks/useAuth';
import {
  LearningPace,
  PreferredContentType,
  LearningPreferencesData,
  AccessibilityPreferencesData,
} from '../../types/profile.types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/SkeletonLoader';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  // Basic Information State
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<string>('');
  const [grade, setGrade] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [learningPace, setLearningPace] = useState<LearningPace>('moderate');
  const [preferredContentType, setPreferredContentType] = useState<PreferredContentType>('mixed');

  // Learning Preferences State
  const [learningPrefs, setLearningPrefs] = useState<LearningPreferencesData>({
    visual_explanations: true,
    step_by_step: true,
    simplified_language: false,
    audio_support: false,
    interactive_learning: true,
    short_sessions: false,
  });

  // Accessibility Preferences State
  const [a11yPrefs, setA11yPrefs] = useState<AccessibilityPreferencesData>({
    large_text: false,
    high_contrast: false,
    text_to_speech: false,
    reduced_visual_complexity: false,
    keyboard_navigation: false,
  });

  // UI States
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load existing profile from API
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const data = await profileService.getProfile();
        if (isMounted) {
          setFullName(data.full_name || '');
          setAge(data.age ? String(data.age) : '');
          setGrade(data.grade || '');
          setPreferredLanguage(data.preferred_language || 'en');
          setLearningPace(data.learning_pace || 'moderate');
          setPreferredContentType(data.preferred_content_type || 'mixed');

          if (data.learning_preference) {
            setLearningPrefs({
              visual_explanations: data.learning_preference.visual_explanations,
              step_by_step: data.learning_preference.step_by_step,
              simplified_language: data.learning_preference.simplified_language,
              audio_support: data.learning_preference.audio_support,
              interactive_learning: data.learning_preference.interactive_learning,
              short_sessions: data.learning_preference.short_sessions,
            });
          }

          if (data.accessibility_preference) {
            setA11yPrefs({
              large_text: data.accessibility_preference.large_text,
              high_contrast: data.accessibility_preference.high_contrast,
              text_to_speech: data.accessibility_preference.text_to_speech,
              reduced_visual_complexity: data.accessibility_preference.reduced_visual_complexity,
              keyboard_navigation: data.accessibility_preference.keyboard_navigation,
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(
            err.response?.data?.error?.message ||
              'Unable to load profile from the server. Using local defaults.'
          );
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleLearningPref = (key: keyof LearningPreferencesData) => {
    setLearningPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleA11yPref = (key: keyof AccessibilityPreferencesData) => {
    setA11yPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Full Name is required (minimum 2 characters).');
      return;
    }

    let parsedAge: number | null = null;
    if (age.trim() !== '') {
      parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 3 || parsedAge > 120) {
        setErrorMessage('Please enter a valid age between 3 and 120.');
        return;
      }
    }

    setIsSaving(true);
    try {
      await profileService.updateProfile({
        full_name: fullName.trim(),
        age: parsedAge,
        grade: grade.trim() || null,
        preferred_language: preferredLanguage,
        learning_pace: learningPace,
        preferred_content_type: preferredContentType,
        learning_preferences: learningPrefs,
        accessibility_preferences: a11yPrefs,
      });

      setSuccessMessage('Learner profile and preferences saved successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const apiError =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        'Failed to save profile changes. Please review your entries and try again.';
      setErrorMessage(apiError);
    } finally {
      setIsSaving(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-surface-200 dark:border-surface-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            Learner Configuration
          </span>
          <Badge variant="brand" size="sm">Personalization</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
          Learner Profile & Preferences
        </h1>
        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
          Customize your learning pace, modality, and assistive features so SILE adapts directly to how you comprehend best.
        </p>
      </div>

      {/* Non-medical purpose disclaimer banner */}
      <div className="p-4 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-xs text-surface-600 dark:text-surface-400 flex items-start space-x-3">
        <svg
          className="h-5 w-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <span className="font-semibold text-surface-900 dark:text-white">Inclusive Design Philosophy: </span>
          SILE captures your learning preferences and support needs to adapt instructional pacing and presentation.
          This profile does not diagnose medical conditions or assign disability labels.
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-3">
          <svg className="h-5 w-5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* Section 1: Basic Information */}
        <Card variant="default" className="p-6">
          <div className="border-b border-surface-100 dark:border-surface-800 pb-4 mb-6">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">1. Basic Information</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Foundational details to personalize greeting and appropriate grade-level content.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              name="fullName"
              required
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSaving}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1">
                Account Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-500 cursor-not-allowed text-xs font-medium"
              />
              <p className="text-[11px] text-surface-400 mt-1">Managed via authentication account.</p>
            </div>

            <Input
              label="Age (Optional)"
              name="age"
              type="number"
              min="3"
              max="120"
              placeholder="e.g. 16"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={isSaving}
            />

            <Select
              label="Grade / Academic Level"
              name="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              disabled={isSaving}
              options={[
                { value: '', label: 'Select Grade Level (Optional)' },
                { value: 'Elementary', label: 'Elementary School (Grades 1-5)' },
                { value: 'Middle School', label: 'Middle School (Grades 6-8)' },
                { value: '9th Grade', label: '9th Grade (High School Freshman)' },
                { value: '10th Grade', label: '10th Grade (High School Sophomore)' },
                { value: '11th Grade', label: '11th Grade (High School Junior)' },
                { value: '12th Grade', label: '12th Grade (High School Senior)' },
                { value: 'Undergraduate', label: 'Undergraduate / College' },
                { value: 'Lifelong Learner', label: 'Lifelong / Adult Learner' },
              ]}
            />

            <Select
              label="Preferred Language"
              name="preferredLanguage"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              disabled={isSaving}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish (Español)' },
                { value: 'fr', label: 'French (Français)' },
                { value: 'de', label: 'German (Deutsch)' },
                { value: 'hi', label: 'Hindi (हिन्दी)' },
                { value: 'zh', label: 'Mandarin (中文)' },
              ]}
            />

            <Select
              label="Learning Pace"
              name="learningPace"
              value={learningPace}
              onChange={(e) => setLearningPace(e.target.value as LearningPace)}
              disabled={isSaving}
              hint="Controls concept explanation depth and review frequency."
              options={[
                { value: 'slow', label: 'Slow (Extended time & more examples)' },
                { value: 'moderate', label: 'Moderate (Standard instructional pacing)' },
                { value: 'fast', label: 'Fast (Accelerated concept progression)' },
              ]}
            />

            <div className="sm:col-span-2">
              <Select
                label="Preferred Content Type"
                name="preferredContentType"
                value={preferredContentType}
                onChange={(e) => setPreferredContentType(e.target.value as PreferredContentType)}
                disabled={isSaving}
                hint="Your default instructional modality across lessons."
                options={[
                  { value: 'text', label: 'Text (Written explanations, summaries, articles)' },
                  { value: 'visual', label: 'Visual (Diagrams, charts, illustrations, infographics)' },
                  { value: 'audio', label: 'Audio (Narrations, spoken instructions, podcasts)' },
                  { value: 'interactive', label: 'Interactive (Step-through exercises, simulators)' },
                  { value: 'mixed', label: 'Mixed (Dynamic multi-modal blend)' },
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Learning Preferences */}
        <Card variant="default" className="p-6">
          <div className="border-b border-surface-100 dark:border-surface-800 pb-4 mb-6">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">2. Learning Preferences</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Select teaching strategies and structural formats that maximize your comprehension.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={learningPrefs.visual_explanations}
                onChange={() => handleToggleLearningPref('visual_explanations')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Visual Explanations</span>
                <span className="text-surface-500">Include visual models, mind maps, and diagrams with text.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={learningPrefs.step_by_step}
                onChange={() => handleToggleLearningPref('step_by_step')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Step-by-Step Guidance</span>
                <span className="text-surface-500">Deconstruct complex topics into progressive sequential phases.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={learningPrefs.simplified_language}
                onChange={() => handleToggleLearningPref('simplified_language')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Simplified Language</span>
                <span className="text-surface-500">Use clear, concise phrasing and highlighted vocabulary keys.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={learningPrefs.audio_support}
                onChange={() => handleToggleLearningPref('audio_support')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Audio Support</span>
                <span className="text-surface-500">Offer voice narration and spoken walkthrough options.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={learningPrefs.interactive_learning}
                onChange={() => handleToggleLearningPref('interactive_learning')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Interactive Learning</span>
                <span className="text-surface-500">Reinforce understanding through hands-on checkpoints & mini-quizzes.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={learningPrefs.short_sessions}
                onChange={() => handleToggleLearningPref('short_sessions')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Short Learning Sessions</span>
                <span className="text-surface-500">Structure units into focused 10-15 minute micro-learning modules.</span>
              </div>
            </label>
          </div>
        </Card>

        {/* Section 3: Accessibility Preferences */}
        <Card variant="default" className="p-6">
          <div className="border-b border-surface-100 dark:border-surface-800 pb-4 mb-6">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">3. Accessibility Preferences</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Sensory and navigation accommodations to ensure equal, barrier-free access.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={a11yPrefs.large_text}
                onChange={() => handleToggleA11yPref('large_text')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Large Text</span>
                <span className="text-surface-500">Scale typography for enhanced visibility and readability.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={a11yPrefs.high_contrast}
                onChange={() => handleToggleA11yPref('high_contrast')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">High Contrast</span>
                <span className="text-surface-500">Enforce strong color contrast between text and background.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={a11yPrefs.text_to_speech}
                onChange={() => handleToggleA11yPref('text_to_speech')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Text-to-Speech Ready</span>
                <span className="text-surface-500">Ensure text blocks are pre-formatted for screen readers and TTS.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={a11yPrefs.reduced_visual_complexity}
                onChange={() => handleToggleA11yPref('reduced_visual_complexity')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Reduced Visual Complexity</span>
                <span className="text-surface-500">Minimize sidebars and decorative elements to avoid clutter.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-surface-200 dark:border-surface-750 hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors sm:col-span-2">
              <input
                type="checkbox"
                checked={a11yPrefs.keyboard_navigation}
                onChange={() => handleToggleA11yPref('keyboard_navigation')}
                className="mt-1 h-4 w-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
                disabled={isSaving}
              />
              <div className="text-xs">
                <span className="font-semibold text-surface-900 dark:text-white block text-sm">Keyboard Navigation Enhancement</span>
                <span className="text-surface-500">Highlight focus indicators for full single-key / Tab navigation.</span>
              </div>
            </label>
          </div>
        </Card>

        {/* Save Bar */}
        <div className="flex justify-end space-x-4 pt-4 border-t border-surface-200 dark:border-surface-800">
          <Button type="submit" variant="primary" size="lg" isLoading={isSaving}>
            Save Profile & Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};
