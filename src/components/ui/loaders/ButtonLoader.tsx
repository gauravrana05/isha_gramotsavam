import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export interface ButtonLoaderProps {
  loading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  loading = false,
  children,
  loadingText,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button'
}) => {
  const baseClasses = `
    inline-flex items-center justify-center gap-2 
    font-medium font-roboto rounded-lg 
    transition-all duration-200 
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[2rem]',
    md: 'px-4 py-2 text-base min-h-[2.5rem]',
    lg: 'px-6 py-3 text-lg min-h-[3rem]'
  };

  const variantClasses = {
    primary: `
      bg-orange-600 hover:bg-orange-700 
      text-white 
      focus:ring-orange-500
      disabled:bg-orange-300 disabled:hover:bg-orange-300
    `,
    secondary: `
      bg-blue-600 hover:bg-blue-700 
      text-white 
      focus:ring-blue-500
      disabled:bg-blue-300 disabled:hover:bg-blue-300
    `,
    outline: `
      border-2 border-orange-600 hover:bg-orange-50 
      text-orange-600 hover:text-orange-700
      focus:ring-orange-500
      disabled:border-orange-300 disabled:text-orange-300 disabled:hover:bg-transparent
    `,
    ghost: `
      hover:bg-gray-100 dark:hover:bg-gray-800
      text-gray-700 dark:text-gray-300
      focus:ring-gray-500
      disabled:text-gray-400 disabled:hover:bg-transparent
    `,
    danger: `
      bg-red-600 hover:bg-red-700 
      text-white 
      focus:ring-red-500
      disabled:bg-red-300 disabled:hover:bg-red-300
    `
  };

  const spinnerSizes = {
    sm: 'xs' as const,
    md: 'sm' as const,
    lg: 'md' as const
  };

  const spinnerColors = {
    primary: 'white' as const,
    secondary: 'white' as const,
    outline: 'primary' as const,
    ghost: 'gray' as const,
    danger: 'white' as const
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      aria-disabled={isDisabled}
    >
      {loading && (
        <LoadingSpinner 
          size={spinnerSizes[size]}
          color={spinnerColors[variant]}
          aria-label="Loading"
        />
      )}
      
      <span className={loading ? 'opacity-75' : ''}>
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  );
};

export default ButtonLoader;