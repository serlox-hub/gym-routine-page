/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds (GitHub dark theme)
        'surface': '#0d1117',
        'surface-card': '#161b22',
        'surface-alt': '#1c2128',
        'surface-block': '#21262d',
        'surface-hover': 'rgba(255, 255, 255, 0.05)',
        // Text
        'primary': '#e6edf3',
        'secondary': '#8b949e',
        'muted': '#6e7681',
        // Semantic colors
        'accent': '#58a6ff',
        'accent-hover': '#79b8ff',
        'purple': '#a371f7',
        'purple-bg': 'rgba(163, 113, 247, 0.15)',
        'success': '#3fb950',
        'success-bg': 'rgba(63, 185, 80, 0.15)',
        'warning': '#d29922',
        'warning-bg': 'rgba(210, 153, 34, 0.15)',
        'danger': '#f85149',
        'danger-bg': 'rgba(248, 81, 73, 0.1)',
        // Borders
        'border': '#30363d',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
