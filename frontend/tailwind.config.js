/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0014',
        surface: '#110a1f',
        surfaceHover: '#1a1230',
        glass: 'rgba(255, 255, 255, 0.03)',
        glassHover: 'rgba(255, 255, 255, 0.08)',
        glassBorder: 'rgba(255, 255, 255, 0.1)',
        borderSubtle: 'rgba(255, 255, 255, 0.06)',
        primary: '#ff007f',
        secondary: '#00f0ff',
        textMain: '#ffffff',
        textMuted: '#a09baf',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.3s ease-out',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'eq-1': 'eq 0.8s ease-in-out infinite',
        'eq-2': 'eq 0.8s ease-in-out 0.1s infinite',
        'eq-3': 'eq 0.8s ease-in-out 0.2s infinite',
        'eq-4': 'eq 0.8s ease-in-out 0.15s infinite',
        'particle': 'particle 20s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(255,0,127,0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(255,0,127,0.7), 0 0 60px rgba(0,240,255,0.3)' },
        },
        'eq': {
          '0%, 100%': { height: '4px' },
          '50%': { height: '20px' },
        },
        'particle': {
          '0%': { transform: 'translateY(100vh) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-100vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
