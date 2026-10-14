/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        corona: {
          dark: '#070A12',
          card: '#0D1424',
          border: '#1E293B',
          navy: '#002D72',
          blue: '#0284C7',
          sky: '#38BDF8',
          gold: '#F5A800',
          yellow: '#FFC72C',
          lightYellow: '#FEF08A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
