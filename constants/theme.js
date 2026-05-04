// constants/theme.js

// DESIGN SYSTEM:
// I established a centralized theme file to manage colors and fonts.
// This follows the 'Design Token' methodology, ensuring that if I want to 
// rebrand the app later (e.g., change the primary red to blue), I only have 
// to change it in one place rather than hunting through every component.

export const COLORS = {
  // I chose a high-contrast 'Netflix-style' red as the primary action color.
  primary: '#E50914',
  primaryGradientEnd: '#B20710',

  // The app uses a strict Dark Mode palette to reduce eye strain and 
  // maintain a cinematic feel, similar to actual movie theater lighting.
  background: '#121212',
  surface: '#1E1E1E',
  accent: '#E50914',

  // Specific RGBA value used for Glassmorphism effects (blur overlays).
  // This is used in the Tab Bar and Hero Carousel to give a modern, layered depth.
  glassmorphism: 'rgba(30,30,30,0.85)',

  // Typography hierarchy for readability.
  textPrimary: '#FFFFFF',
  textSecondary: '#D1D1D1',
  textMuted: '#888888',

  gold: '#FFD700',
  transparent: 'transparent',
  black: '#000000',
  white: '#FFFFFF',
};

export const FONTS = {
  // Using a single constant for the font family ensures global consistency.
  urbanist: 'urbanist',
};