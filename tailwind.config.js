// tailwind.config.js

const { designTokens } = require('./src/lib/design-tokens')

/** @type {import('tailwindcss').Config} */
module.exports = {
  safelist: [
    {
      pattern: /bg-primary-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /hover:bg-primary-(500|600|700)/,
    },
    {
      pattern: /active:bg-primary-(500|600|700)/,
    },
    {
      pattern: /focus:ring-primary-(500|600|700)/,
    },
    {
      pattern: /text-white/,
    },
  ],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        fira: ['Fira Sans', 'sans-serif'],
        sans: ['Fira Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // From design tokens
        primary: designTokens.colors.primary,
        secondary: designTokens.colors.secondary,
        success: designTokens.colors.success,
        danger: designTokens.colors.error,
        warning: designTokens.colors.warning,
        info: designTokens.colors.info,
        gray: designTokens.colors.gray,
        black: designTokens.colors.black,
        white: designTokens.colors.white,

        // Optional: Keep custom isha colors
        isha: {
          cream: '#F3F0E5',
          saffron: '#F28C38',
          'saffron-dark': '#E67A26',
          brown: '#4A2F1D',
          ochre: '#C79016',
          green: '#3A7F3F',
        },
      },
      backgroundColor: {
        isha: '#F3F0E5',
      },
      textColor: {
        primary: '#4A2F1D',
      },
    },
  },
  plugins: [],
}
