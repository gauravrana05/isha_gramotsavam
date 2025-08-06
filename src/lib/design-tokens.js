// Design tokens for mobile-first responsive design
// All values scale perfectly from mobile (320px) to desktop (1440px+)

const designTokens = {
  // Color system
  colors: {
    // Primary brand colors
    primary: {
      50: '#FFF7ED',
      100: '#FFEDD5', 
      200: '#FED3A8',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F28C38', // Main brand color
      600: '#E67A26',
      700: '#C2621A',
      800: '#9A4D14',
      900: '#7C3A0F',
    },
    
    // Secondary colors
    secondary: {
      50: '#F7F5F0',
      100: '#F3F0E5',
      200: '#E8E0CC',
      300: '#D6C8A8',
      400: '#C2A876',
      500: '#B08B4A',
      600: '#9C7333',
      700: '#7A5A28',
      800: '#644A22',
      900: '#4A2F1D', // Dark brown
    },
    
    // Semantic colors
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
    },
    
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },
    
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    
    info: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    
    // Neutral grays
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    
    // Special colors
    white: '#FFFFFF',
    black: '#000000',
  },
  
  // Spacing system (mobile-first, scales up)
  spacing: {
    // Base unit: 4px (rem equivalent)
    0: '0',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem',     // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem',    // 12px
    3.5: '0.875rem', // 14px
    4: '1rem',       // 16px - base mobile touch target
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    7: '1.75rem',    // 28px
    8: '2rem',       // 32px
    9: '2.25rem',    // 36px
    10: '2.5rem',    // 40px
    11: '2.75rem',   // 44px - minimum touch target
    12: '3rem',      // 48px
    14: '3.5rem',    // 56px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
    28: '7rem',      // 112px
    32: '8rem',      // 128px
    36: '9rem',      // 144px
    40: '10rem',     // 160px
    44: '11rem',     // 176px
    48: '12rem',     // 192px
    52: '13rem',     // 208px
    56: '14rem',     // 224px
    60: '15rem',     // 240px
    64: '16rem',     // 256px
    72: '18rem',     // 288px
    80: '20rem',     // 320px
    96: '24rem',     // 384px
  },
  
  // Typography system (mobile-first, fluid scaling)
  typography: {
    fontFamily: {
      fira: ['Fira Sans', 'system-ui', 'sans-serif'],
      roboto: ['Roboto', 'system-ui', 'sans-serif'],
      system: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    },
    
    // Mobile-first font sizes with fluid scaling
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],     // 12px, mobile readable
      sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],    // 16px - mobile base
      lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],   // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
      '5xl': ['3rem', { lineHeight: '1.16' }],        // 48px
      '6xl': ['3.75rem', { lineHeight: '1.13' }],     // 60px
      '7xl': ['4.5rem', { lineHeight: '1.11' }],      // 72px
    },
    
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
    
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },
  
  // Responsive breakpoints (mobile-first)
  breakpoints: {
    sm: '640px',   // Small tablets
    md: '768px',   // Tablets  
    lg: '1024px',  // Laptops
    xl: '1280px',  // Desktop
    '2xl': '1536px', // Large desktop
  },
  
  // Border radius system
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px  
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',   // pill shape
  },
  
  // Shadow system (mobile-optimized)
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
  },
  
  // Z-index layers
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
  
  // Animation/transition system
  animation: {
    duration: {
      fastest: '100ms',
      fast: '200ms',
      normal: '300ms',
      slow: '500ms',
      slowest: '800ms',
    },
    
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)', 
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  
  // Component-specific tokens
  components: {
    // Touch targets (mobile-first)
    touchTarget: {
      min: '44px', // Minimum touch target size
      comfortable: '48px',
      spacious: '56px',
    },
    
    // Container widths
    container: {
      sm: '640px',
      md: '768px', 
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    
    // Form elements
    input: {
      height: {
        sm: '32px',
        base: '40px',  // Mobile-friendly
        lg: '48px',
      },
      padding: {
        sm: '8px 12px',
        base: '12px 16px',
        lg: '16px 20px', 
      },
    },
    
    // Button sizing (mobile-optimized)
    button: {
      height: {
        sm: '32px',
        base: '44px',  // Meets touch target
        lg: '48px',
        xl: '56px',
      },
      padding: {
        sm: '8px 16px',
        base: '12px 24px',
        lg: '16px 32px',
        xl: '20px 40px',
      },
    },
  },
};

module.exports = { designTokens };