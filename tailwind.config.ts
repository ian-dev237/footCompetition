import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0D1117',
          secondary: '#161B22',
          tertiary: '#21262D',
        },
        accent: {
          blue: '#3B82F6',
          gold: '#F59E0B',
          cyan: '#06B6D4',
        },
        status: {
          win: '#10B981',
          loss: '#EF4444',
          draw: '#6B7280',
        },
        txt: {
          primary: '#F0F6FC',
          secondary: '#8B949E',
          muted: '#484F58',
        },
        bdr: '#30363D',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        livepulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(1.2)' },
        },
        confetti: {
          '0%':   { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
      animation: {
        livepulse: 'livepulse 1.2s ease-in-out infinite',
        confetti: 'confetti 3s ease-in forwards',
      },
    },
  },
  plugins: [],
};

export default config;
