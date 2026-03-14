import { colors } from './src/lib/styles.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'surface': colors.bgPrimary,
        'surface-card': colors.bgSecondary,
        'surface-alt': colors.bgAlt,
        'surface-block': colors.bgTertiary,
        'surface-hover': colors.bgHover,
        // Text
        'primary': colors.textPrimary,
        'secondary': colors.textSecondary,
        'muted': colors.textMuted,
        // Semantic
        'accent': colors.accent,
        'accent-hover': colors.accentHover,
        'purple': colors.purple,
        'purple-bg': colors.purpleBg,
        'success': colors.success,
        'success-bg': colors.successBg,
        'warning': colors.warning,
        'warning-bg': colors.warningBg,
        'danger': colors.danger,
        'danger-bg': colors.dangerBg,
        // Borders
        'border': colors.border,
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
