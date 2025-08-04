import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export interface SectionLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card' | 'inline' | 'overlay';
  height?: 'auto' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  showMessage?: boolean;
}

const SectionLoader: React.FC<SectionLoaderProps> = ({
  message = 'Loading...',
  size = 'md',
  variant = 'default',
  height = 'auto',
  className = '',
  showMessage = true
}) => {
  const heightClasses = {
    auto: '',
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
    full: 'h-full'
  };

  const spinnerSizes = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const variantClasses = {
    default: 'bg-transparent',
    card: 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm',
    inline: 'bg-transparent',
    overlay: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm'
  };

  const paddingClasses = {
    default: 'p-6',
    card: 'p-6',
    inline: 'py-2',
    overlay: 'p-6'
  };

  const baseClasses = `
    ${heightClasses[height]}
    ${variantClasses[variant]}
    ${paddingClasses[variant]}
    flex flex-col items-center justify-center
    ${variant === 'inline' ? 'flex-row gap-3' : 'gap-3'}
    ${className}
  `;

  const content = (
    <>
      <LoadingSpinner 
        size={spinnerSizes[size]}
        color="primary"
        aria-label={message}
      />
      {showMessage && (
        <span className={`
          ${textSizes[size]} 
          text-gray-600 dark:text-gray-400 
          font-roboto
          ${variant === 'inline' ? '' : 'text-center'}
        `}>
          {message}
        </span>
      )}
    </>
  );

  if (variant === 'overlay') {
    return (
      <div className="relative">
        <div className={`absolute inset-0 z-10 ${baseClasses}`}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={baseClasses} role="status" aria-live="polite">
      {content}
    </div>
  );
};

export default SectionLoader;