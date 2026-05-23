/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1a5c38',
          teal: '#0e7c5a',
          light: '#2aab7b',
          orange: '#e87722',
          amber: '#f59e0b',
          dark: '#0d2b1e',
          muted: '#1e4d33',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'mesh-green': 'radial-gradient(at 40% 20%, #1a5c38 0px, transparent 50%), radial-gradient(at 80% 0%, #0e7c5a 0px, transparent 50%), radial-gradient(at 0% 50%, #0d2b1e 0px, transparent 50%)',
      },
      animation: {
        'scan': 'scan 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'spin-slow': 'spin 18s linear infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { transform: 'translateY(0%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(14, 124, 90, 0.4)' },
          '50%': { boxShadow: '0 0 0 20px rgba(14, 124, 90, 0)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
