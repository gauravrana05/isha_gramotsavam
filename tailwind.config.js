/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Define breakpoints (matching --breakpoint-* in globals.css)
    screens: {
      sm: '40rem',
      md: '48rem',
      lg: '64rem',
      xl: '80rem',
      '2xl': '96rem',
    },
    extend: {
      // Colors (aligned with @theme in globals.css)
      colors: {
        primary: {
          50: '#fef5ef',
          100: '#fce7d8',
          500: '#F28C38', // Matches --color-primary-500
          600: '#E65100', // Matches --color-primary-600
          700: '#c2410c',
        },
        secondary: {
          50: '#f8fafc',
          100: '#F5F5F5', // Matches --color-secondary-100
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          900: '#4A3728', // Matches --color-secondary-900
        },
        gray: {
          400: '#9ca3af',
          500: '#6b7280',
          700: '#374151',
          900: '#111827',
        },
        success: '#3A7F3F',
        warning: '#C79016',
        error: '#AF0000',
        info: '#1565C0',
        white: '#fff',
        isha: {
          cream: '#F5F5F5',
          saffron: '#F28C38',
          'saffron-dark': '#E65100',
          brown: '#4A3728',
          ochre: '#C79016',
          green: '#3A7F3F',
        },
      },
      // Font families
      fontFamily: {
        fira: ['Fira Sans', 'sans-serif'],
        sans: ['Fira Sans', 'sans-serif'], // Override default sans
      },
      // Spacing
      spacing: {
        px: '1px',
        0: '0',
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        6: '1.5rem',
        8: '2rem',
      },
      // Component-specific sizing
      minHeight: {
        'touch-sm': '2rem',
        'touch-base': '2.5rem',
        'touch-lg': '3rem',
        'touch-xl': '3.5rem',
      },
      // Typography
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.625,
      },
      letterSpacing: {
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
      },
      // Border radius
      borderRadius: {
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      // Shadows
      boxShadow: {
        sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      // Animation
      transitionDuration: {
        DEFAULT: '200ms',
        300: '300ms',
      },
      transitionTimingFunction: {
        'ease-in-out': 'ease-in-out',
      },
    },
  },
  plugins: [],
};