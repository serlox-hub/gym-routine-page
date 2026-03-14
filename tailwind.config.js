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
        'surface-alt': '#1c2128',
        'surface-block': colors.bgTertiary,
        'surface-hover': 'rgba(255, 255, 255, 0.05)',
        // Text
        'primary': colors.textPrimary,
        'secondary': colors.textSecondary,
        'muted': '#6e7681',
        // Semantic
        'accent': colors.accent,
        'accent-hover': '#79b8ff',
        'purple': colors.purple,
        'purple-bg': 'rgba(163, 113, 247, 0.15)',
        'success': colors.success,
        'success-bg': 'rgba(63, 185, 80, 0.15)',
        'warning': colors.warning,
        'warning-bg': 'rgba(210, 153, 34, 0.15)',
        'danger': colors.danger,
        'danger-bg': 'rgba(248, 81, 73, 0.1)',
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
