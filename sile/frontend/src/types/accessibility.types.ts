export type ThemeMode = 'light' | 'dark' | 'high_contrast' | 'soft_warm';
export type FontFamily = 'system' | 'open_dyslexic' | 'sans_serif' | 'monospace';
export type FontSizeScale = 'standard' | 'medium' | 'large' | 'extra_large';

export interface AccessibilityPreference {
  id: string;
  learner_profile_id: string;
  theme_mode: ThemeMode;
  font_family: FontFamily;
  font_size_scale: FontSizeScale;
  high_contrast: boolean;
  reduce_animations: boolean;
  text_to_speech_enabled: boolean;
  screen_mask_enabled: boolean;
  line_spacing: number;
}
