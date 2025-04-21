/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a365d',  // Il colore principale del brand
          light: '#2a4365',
          dark: '#0a2540',
        },
        secondary: {
          DEFAULT: '#718096',
          light: '#A0AEC0',
          dark: '#4A5568',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out forwards',
        'fade-out': 'fadeOut 0.5s ease-in-out forwards',
        'fade-in-slow': 'fadeIn 1s ease-in-out forwards',
        'fade-out-slow': 'fadeOut 1s ease-in-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
  darkMode: 'class',
  important: true,
}; 