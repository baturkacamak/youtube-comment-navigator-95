/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  darkMode: 'class',
  important: '#youtube-comment-navigator-app',
  theme: {
    extend: {
      keyframes: {
        'highlight-bar-expand': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        'highlight-bar': 'highlight-bar-expand 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
}
