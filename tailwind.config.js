// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'fira': ['Fira Sans', 'sans-serif'],
        'sans': ['Fira Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        isha: {
          cream: '#F3F0E5',
          saffron: '#F28C38',
          'saffron-dark': '#E67A26',
          brown: '#4A2F1D',
          ochre: '#C79016',
          green: '#3A7F3F',
        },
        primary: {
          DEFAULT: '#F28C38',
          dark: '#E67A26',
        },
        secondary: {
          DEFAULT: '#4A2F1D',
        }
      },
      backgroundColor: {
        'isha': '#F3F0E5',
      },
      textColor: {
        'primary': '#4A2F1D',
      }
    },
  },
  plugins: [],
}