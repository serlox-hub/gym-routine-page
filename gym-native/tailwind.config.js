/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx}",
    "./src/**/*.{js,jsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'surface': '#0d1117',
        'surface-card': '#161b22',
        'surface-alt': '#1c2128',
        'surface-block': '#21262d',
        'primary': '#e6edf3',
        'secondary': '#8b949e',
        'muted': '#6e7681',
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
        'border': '#30363d',
      },
    },
  },
  plugins: [],
}
