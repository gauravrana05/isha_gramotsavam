// Responsive utilities for mobile-first design
// Ensures components work seamlessly across all devices

import { designTokens } from './design-tokens';

// Breakpoint utilities
export const breakpoints = designTokens.breakpoints;

// Media query helpers
export const mediaQueries = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
  
  // Max-width queries (mobile-first approach)
  'max-sm': `@media (max-width: ${parseInt(breakpoints.sm) - 1}px)`,
  'max-md': `@media (max-width: ${parseInt(breakpoints.md) - 1}px)`, 
  'max-lg': `@media (max-width: ${parseInt(breakpoints.lg) - 1}px)`,
  
  // Touch device detection
  touch: '@media (hover: none) and (pointer: coarse)',
  hover: '@media (hover: hover) and (pointer: fine)',
  
  // Orientation
  portrait: '@media (orientation: portrait)',
  landscape: '@media (orientation: landscape)',
  
  // High DPI screens
  retina: '@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
} as const;

// Responsive spacing utilities
export const responsiveSpacing = {
  // Container padding that adapts to screen size
  containerPadding: {
    mobile: designTokens.spacing[4],  // 16px on mobile
    tablet: designTokens.spacing[6],  // 24px on tablet
    desktop: designTokens.spacing[8], // 32px on desktop
  },
  
  // Section spacing
  sectionSpacing: {
    mobile: designTokens.spacing[8],   // 32px
    tablet: designTokens.spacing[12],  // 48px
    desktop: designTokens.spacing[16], // 64px
  },
  
  // Component spacing
  componentSpacing: {
    mobile: designTokens.spacing[4],  // 16px
    tablet: designTokens.spacing[6],  // 24px
    desktop: designTokens.spacing[8], // 32px
  },
} as const;

// Responsive typography utilities
export const responsiveTypography = {
  // Fluid font sizing
  fluidScale: (minSize: number, maxSize: number, minVw = 320, maxVw = 1200) => {
    const slope = (maxSize - minSize) / (maxVw - minVw);
    const intercept = minSize - slope * minVw;
    return `clamp(${minSize}px, ${intercept}px + ${slope * 100}vw, ${maxSize}px)`;
  },
  
  // Pre-defined fluid scales
  headings: {
    h1: {
      mobile: designTokens.typography.fontSize['2xl'][0],  // 24px
      desktop: designTokens.typography.fontSize['4xl'][0], // 36px
    },
    h2: {
      mobile: designTokens.typography.fontSize.xl[0],      // 20px
      desktop: designTokens.typography.fontSize['3xl'][0], // 30px
    },
    h3: {
      mobile: designTokens.typography.fontSize.lg[0],      // 18px
      desktop: designTokens.typography.fontSize['2xl'][0], // 24px
    },
    h4: {
      mobile: designTokens.typography.fontSize.base[0],    // 16px
      desktop: designTokens.typography.fontSize.xl[0],     // 20px
    },
  },
  
  body: {
    large: {
      mobile: designTokens.typography.fontSize.base[0],    // 16px
      desktop: designTokens.typography.fontSize.lg[0],     // 18px
    },
    base: {
      mobile: designTokens.typography.fontSize.base[0],    // 16px (always readable)
      desktop: designTokens.typography.fontSize.base[0],   // 16px
    },
    small: {
      mobile: designTokens.typography.fontSize.sm[0],      // 14px
      desktop: designTokens.typography.fontSize.sm[0],     // 14px
    },
  },
} as const;

// Touch-friendly sizing
export const touchTargets = {
  // Minimum touch targets (44px minimum per accessibility guidelines)
  min: designTokens.components.touchTarget.min,
  comfortable: designTokens.components.touchTarget.comfortable,
  spacious: designTokens.components.touchTarget.spacious,
  
  // Button sizing based on importance
  button: {
    small: '36px',     // For secondary actions
    base: '44px',      // Default touch target
    large: '48px',     // Primary actions
    hero: '56px',      // Hero/CTA buttons
  },
  
  // Input sizing
  input: {
    compact: '40px',   // For forms with many fields
    base: '44px',      // Default input height
    comfortable: '48px', // For important inputs
  },
} as const;

// Layout utilities
export const layouts = {
  // Container max-widths that work on all devices
  container: {
    sm: designTokens.components.container.sm,
    md: designTokens.components.container.md,
    lg: designTokens.components.container.lg,
    xl: designTokens.components.container.xl,
    '2xl': designTokens.components.container['2xl'],
    full: '100%',
  },
  
  // Grid utilities
  grid: {
    // Mobile-first grid columns
    mobile: {
      single: 'grid-cols-1',
      double: 'grid-cols-2',
    },
    tablet: {
      triple: 'md:grid-cols-3',
      quad: 'md:grid-cols-4',
    },
    desktop: {
      six: 'lg:grid-cols-6',
      twelve: 'lg:grid-cols-12',
    },
  },
  
  // Common layout patterns
  patterns: {
    // Stack on mobile, side-by-side on desktop
    mobileStack: 'flex flex-col md:flex-row',
    // Full width on mobile, auto on desktop
    mobileFullWidth: 'w-full md:w-auto',
    // Hidden on mobile, visible on desktop
    desktopOnly: 'hidden md:block',
    // Visible on mobile, hidden on desktop
    mobileOnly: 'block md:hidden',
  },
} as const;

// Animation utilities optimized for mobile
export const animations = {
  // Reduced motion support
  respectsMotion: (animation: string) => `
    @media (prefers-reduced-motion: no-preference) {
      ${animation}
    }
  `,
  
  // Mobile-optimized durations (slightly faster for responsiveness)
  duration: {
    instant: '100ms',
    fast: '200ms',
    normal: '250ms',    // Slightly faster than desktop
    slow: '400ms',
    slowest: '600ms',
  },
  
  // Touch-friendly easing curves
  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
  
  // Common mobile animations
  slideIn: 'transform transition-transform duration-250 ease-smooth',
  fadeIn: 'opacity transition-opacity duration-250 ease-smooth',
  scaleIn: 'transform transition-transform duration-200 ease-bounce',
} as const;

// Utility functions
export const utils = {
  // Check if we're on a touch device
  isTouchDevice: () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },
  
  // Get current breakpoint
  getCurrentBreakpoint: () => {
    if (typeof window === 'undefined') return 'mobile';
    
    const width = window.innerWidth;
    if (width >= parseInt(breakpoints['2xl'])) return '2xl';
    if (width >= parseInt(breakpoints.xl)) return 'xl';
    if (width >= parseInt(breakpoints.lg)) return 'lg';
    if (width >= parseInt(breakpoints.md)) return 'md';
    if (width >= parseInt(breakpoints.sm)) return 'sm';
    return 'mobile';
  },
  
  // Generate responsive classes
  responsive: (classes: {
    mobile?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
  }) => {
    return [
      classes.mobile || '',
      classes.sm ? `sm:${classes.sm}` : '',
      classes.md ? `md:${classes.md}` : '',
      classes.lg ? `lg:${classes.lg}` : '',
      classes.xl ? `xl:${classes.xl}` : '',
      classes['2xl'] ? `2xl:${classes['2xl']}` : '',
    ].filter(Boolean).join(' ');
  },
  
  // Clamp utility for fluid sizing
  clamp: (min: string, preferred: string, max: string) => 
    `clamp(${min}, ${preferred}, ${max})`,
    
  // Convert px to rem
  pxToRem: (px: number) => `${px / 16}rem`,
  
  // Generate fluid typography
  fluidType: (minPx: number, maxPx: number, minVw = 320, maxVw = 1200) => {
    const minRem = minPx / 16;
    const maxRem = maxPx / 16;
    const slope = (maxRem - minRem) / (maxVw - minVw);
    const intercept = minRem - slope * minVw;
    
    return `clamp(${minRem}rem, ${intercept}rem + ${slope * 100}vw, ${maxRem}rem)`;
  },
} as const;

// CSS-in-JS helpers for styled-components or emotion
export const cssHelpers = {
  // Media query helper
  mq: (breakpoint: keyof typeof mediaQueries) => mediaQueries[breakpoint],
  
  // Container query helper (for future support)
  container: (size: string) => `@container (min-width: ${size})`,
  
  // Focus styles that work on both mobile and desktop
  focusStyles: `
    &:focus {
      outline: 2px solid ${designTokens.colors.primary[500]};
      outline-offset: 2px;
    }
    
    &:focus:not(:focus-visible) {
      outline: none;
    }
    
    &:focus-visible {
      outline: 2px solid ${designTokens.colors.primary[500]};
      outline-offset: 2px;
    }
  `,
  
  // Touch-friendly hover states
  hoverStyles: (hoverCss: string) => `
    @media (hover: hover) and (pointer: fine) {
      &:hover {
        ${hoverCss}
      }
    }
    
    @media (hover: none) and (pointer: coarse) {
      &:active {
        ${hoverCss}
      }
    }
  `,
} as const;

export default {
  mediaQueries,
  responsiveSpacing,
  responsiveTypography,
  touchTargets,
  layouts,
  animations,
  utils,
  cssHelpers,
};