// Component architecture patterns and utilities
// Ensures consistent APIs and mobile-first design across all components

import React, { ReactNode, HTMLAttributes, forwardRef } from 'react';
import { designTokens } from './design-tokens';
import { utils } from './responsive-utils';

// Base component props that all components should extend
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  testId?: string;
}

// Size variants used across components
export type SizeVariant = 'sm' | 'base' | 'lg' | 'xl';

// Color variants for semantic styling
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'gray';

// Common responsive props
export interface ResponsiveProps {
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  fullWidthOnMobile?: boolean;
}

// Loading state interface
export interface LoadingProps {
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
}

// Compound component pattern utilities
export type CompoundComponentType<T = {}> = React.FC<T> & {
  [key: string]: React.FC<any>;
};

// Class name composition utility
export const cn = (...classes: (string | undefined | null | boolean)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Variant class generator
export const createVariantClasses = <T extends string>(
  variants: Record<T, string>,
  defaultVariant: T
) => {
  return (variant: T = defaultVariant): string => variants[variant] || variants[defaultVariant];
};

// Size class generator for consistent component sizing
export const createSizeClasses = (type: 'button' | 'input' | 'text' = 'button') => {
  const sizeClasses = {
    button: {
      sm: 'h-8 px-3 text-sm',
      base: 'h-11 px-6 text-base', // 44px height for touch
      lg: 'h-12 px-8 text-lg',     // 48px height
      xl: 'h-14 px-10 text-xl',    // 56px height
    },
    input: {
      sm: 'h-8 px-3 text-sm',
      base: 'h-11 px-4 text-base', // 44px height for touch
      lg: 'h-12 px-4 text-lg',
      xl: 'h-14 px-4 text-xl',
    },
    text: {
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
  };
  
  return (size: SizeVariant = 'base') => sizeClasses[type][size];
};

// Responsive visibility utilities
export const createResponsiveClasses = ({ 
  hideOnMobile, 
  hideOnDesktop, 
  fullWidthOnMobile 
}: ResponsiveProps) => {
  return cn(
    hideOnMobile && 'hidden md:block',
    hideOnDesktop && 'block md:hidden',
    fullWidthOnMobile && 'w-full md:w-auto'
  );
};

// Focus and interaction states for accessibility
export const focusClasses = [
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'focus:ring-primary-500',
  'focus-visible:ring-2',
  'focus-visible:ring-offset-2', 
  'focus-visible:ring-primary-500',
].join(' ');

// Disabled state classes
export const disabledClasses = [
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'disabled:pointer-events-none',
].join(' ');

// Loading state classes
export const loadingClasses = [
  'relative',
  'disabled:opacity-75',
].join(' ');

// Touch-friendly hover states
export const hoverClasses = (hoverStyle: string) => cn(
  // Only apply hover on devices that support it
  'hover:' + hoverStyle,
  // Use active state for touch devices
  'active:' + hoverStyle.replace('hover:', ''),
);

// Animation classes that respect reduced motion
export const animationClasses = {
  transition: 'transition-all duration-200 ease-in-out',
  fadeIn: 'animate-in fade-in duration-200',
  slideIn: 'animate-in slide-in-from-bottom-2 duration-200',
  scaleIn: 'animate-in zoom-in-95 duration-200',
};

// Color system for consistent theming
export const colorClasses = {
  primary: {
    bg: 'bg-primary-500 hover:bg-primary-600',
    text: 'text-primary-500',
    border: 'border-primary-500',
    ring: 'ring-primary-500',
  },
  secondary: {
    bg: 'bg-secondary-500 hover:bg-secondary-600',
    text: 'text-secondary-500',
    border: 'border-secondary-500',
    ring: 'ring-secondary-500',
  },
  success: {
    bg: 'bg-green-500 hover:bg-green-600',
    text: 'text-green-500',
    border: 'border-green-500',
    ring: 'ring-green-500',
  },
  error: {
    bg: 'bg-red-500 hover:bg-red-600',
    text: 'text-red-500',
    border: 'border-red-500',
    ring: 'ring-red-500',
  },
  warning: {
    bg: 'bg-yellow-500 hover:bg-yellow-600',
    text: 'text-yellow-500',
    border: 'border-yellow-500',
    ring: 'ring-yellow-500',
  },
  info: {
    bg: 'bg-blue-500 hover:bg-blue-600',
    text: 'text-blue-500',
    border: 'border-blue-500',
    ring: 'ring-blue-500',
  },
  gray: {
    bg: 'bg-gray-500 hover:bg-gray-600',
    text: 'text-gray-500',
    border: 'border-gray-500',
    ring: 'ring-gray-500',
  },
};

// Component factory for consistent component creation
export const createComponent = <T extends HTMLElement = HTMLDivElement>(
  displayName: string,
  defaultElement: keyof React.JSX.IntrinsicElements = 'div'
) => {
  const Component = forwardRef<T, BaseComponentProps & HTMLAttributes<T>>((props, ref) => {
    const { className, children, testId, ...rest } = props;
    const Element = defaultElement as React.ElementType;
    
    return React.createElement(
      defaultElement, 
      {ref,
        className,
        'data-testid': testId,
        ...rest
      },
      children
    );
  });
  
  Component.displayName = displayName;
  return Component;
};

// Status badge utility (used across multiple components)
export const createStatusBadgeClasses = (status: 'active' | 'inactive' | 'pending' | 'success' | 'error' | 'warning') => {
  const statusClasses = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
  };
  
  return cn(
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    statusClasses[status]
  );
};

// Mobile-optimized table utilities
export const tableClasses = {
  wrapper: 'overflow-x-auto',
  table: 'min-w-full divide-y divide-gray-200',
  header: 'bg-gray-50',
  headerCell: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  row: 'hover:bg-gray-50 transition-colors',
  cell: 'px-6 py-4 whitespace-nowrap',
  // Mobile card alternative
  mobileCard: 'bg-white rounded-lg border p-4 space-y-3 md:hidden',
  mobileCardGrid: 'grid grid-cols-2 gap-4',
  mobileCardLabel: 'text-xs text-gray-500',
  mobileCardValue: 'text-sm font-medium text-gray-900',
};

// Form field wrapper utility
export const createFormFieldClasses = (hasError?: boolean) => ({
  wrapper: 'space-y-1',
  label: 'block text-sm font-medium text-gray-700',
  input: cn(
    'w-full rounded-lg border transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    hasError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
  ),
  error: 'text-sm text-red-600',
  hint: 'text-sm text-gray-500',
});

// Grid system utilities
export const gridClasses = {
  container: 'mx-auto px-4 sm:px-6 lg:px-8',
  maxWidth: {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
  },
  grid: {
    cols1: 'grid grid-cols-1',
    cols2: 'grid grid-cols-1 md:grid-cols-2',
    cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    cols6: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  },
  gap: {
    sm: 'gap-4',
    base: 'gap-6',
    lg: 'gap-8',
  },
};

// Loading spinner component pattern
export const spinnerClasses = {
  sm: 'w-4 h-4',
  base: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  animation: 'animate-spin',
};

// Common component compositions
export const compositions = {
  // Button with icon pattern
  buttonWithIcon: (iconPosition: 'left' | 'right' = 'left') => ({
    button: 'inline-flex items-center gap-2',
    icon: iconPosition === 'left' ? 'order-first' : 'order-last',
  }),
  
  // Card with header pattern
  cardWithHeader: {
    card: 'bg-white rounded-lg border overflow-hidden',
    header: 'px-6 py-4 border-b border-gray-200',
    content: 'px-6 py-4',
    footer: 'px-6 py-4 border-t border-gray-200 bg-gray-50',
  },
  
  // Modal pattern
  modal: {
    overlay: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
    content: 'bg-white rounded-lg max-w-md w-full mx-auto shadow-xl',
    header: 'px-6 py-4 border-b border-gray-200',
    body: 'px-6 py-4',
    footer: 'px-6 py-4 border-t border-gray-200 flex justify-end gap-3',
  },
};

// Export everything
export default {
  cn,
  createVariantClasses,
  createSizeClasses,
  createResponsiveClasses,
  focusClasses,
  disabledClasses,
  loadingClasses,
  hoverClasses,
  animationClasses,
  colorClasses,
  createComponent,
  createStatusBadgeClasses,
  tableClasses,
  createFormFieldClasses,
  gridClasses,
  spinnerClasses,
  compositions,
};