/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./src/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Primary institutional azure/navy — actions, links, active nav
        brand: {
          50: '#eef7fd', 100: '#d5ebfa', 200: '#aed6f3', 300: '#7cbaea',
          400: '#4498db', 500: '#1f7cc4', 600: '#1463a6', 700: '#124f86',
          800: '#14446f', 900: '#0f2f4d', 950: '#0a2137',
        },
        // Dark navy chrome for the sidebar / rails
        navy: {
          700: '#123152', 800: '#0e2743', 900: '#0a1e35', 950: '#07162a',
        },
        // Teal accent — data, secondary emphasis
        teal: {
          400: '#2bb7a6', 500: '#12988a', 600: '#0c7d72',
        },
        success: { 50: '#e9f8f0', 500: '#0e9f6e', 600: '#057a55', 700: '#046c4e' },
        danger:  { 50: '#fdecec', 500: '#e02424', 600: '#c81e1e', 700: '#9b1c1c' },
        warning: { 50: '#fdf6e7', 500: '#c27803', 600: '#9f580a', 700: '#8e4b10' },
        info:    { 50: '#ebf3fe', 500: '#1c64f2', 600: '#1a56db' },
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.4rem' }],
      },
      borderRadius: { md: '0.4rem', lg: '0.55rem', xl: '0.8rem' },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16,33,55,0.04), 0 1px 3px 0 rgba(16,33,55,0.06)',
        raised: '0 4px 12px -2px rgba(16,33,55,0.10), 0 2px 6px -2px rgba(16,33,55,0.06)',
        pop: '0 12px 32px -8px rgba(10,33,55,0.22)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-up': { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: 0, transform: 'scale(0.97)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-up': 'slide-up 0.18s ease-out',
        'scale-in': 'scale-in 0.12s ease-out',
      },
    },
  },
  plugins: [],
};
