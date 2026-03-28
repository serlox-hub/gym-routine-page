import nativewindPreset from 'nativewind/preset'
import { colors } from './src/lib/styles.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./App.{js,jsx}",
    "./src/**/*.{js,jsx}",
  ],
  presets: [nativewindPreset],
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
        'light': colors.textLight,
        'white': colors.white,
        // Semantic
        'accent': colors.accent,
        'accent-hover': colors.accentHover,
        'purple': colors.purple,
        'purple-accent': colors.purpleAccent,
        'purple-bg': colors.purpleBg,
        'purple-accent-bg': colors.purpleAccentBg,
        'success': colors.success,
        'success-bg': colors.successBg,
        'warning': colors.warning,
        'warning-bg': colors.warningBg,
        'danger': colors.danger,
        'danger-bg': colors.dangerBg,
        'orange': colors.orange,
        'orange-bg': colors.orangeBg,
        'accent-bg': colors.accentBg,
        'accent-bg-subtle': colors.accentBgSubtle,
        'action-primary': colors.actionPrimary,
        'action-primary-bg': colors.actionPrimaryBg,
        'text-dark': colors.textDark,
        // Borders
        'border': colors.border,
      },
    },
  },
  plugins: [],
}
