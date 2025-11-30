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
        surface: {
          DEFAULT: '#18181b', // zinc-900
          alt: '#27272a',     // zinc-800
          hover: '#3f3f46',   // zinc-700
        },
        // Text
        primary: '#fafafa',   // zinc-50
        secondary: '#a1a1aa', // zinc-400
        muted: '#71717a',     // zinc-500
        // Semantic
        accent: {
          DEFAULT: '#3b82f6', // blue-500
          hover: '#2563eb',   // blue-600
        },
        success: {
          DEFAULT: '#22c55e', // green-500
          hover: '#16a34a',   // green-600
        },
        warning: {
          DEFAULT: '#f59e0b', // amber-500
          hover: '#d97706',   // amber-600
        },
        danger: {
          DEFAULT: '#ef4444', // red-500
          hover: '#dc2626',   // red-600
        },
        // Borders
        border: {
          DEFAULT: '#3f3f46', // zinc-700
          light: '#52525b',   // zinc-600
        },
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
