import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export interface PageLoaderProps {
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'minimal' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({
  title = 'Loading...',
  subtitle,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const containerClasses = {
    default: 'min-h-screen bg-gray-50 dark:bg-gray-900',
    minimal: 'min-h-[60vh]',
    brand: 'min-h-screen bg-secondary-100'
  };

  const spinnerSizes = {
    sm: 'md' as const,
    md: 'lg' as const,
    lg: 'xl' as const
  };

  const textSizes = {
    sm: {
      title: 'text-base sm:text-md',
      subtitle: 'text-sm'
    },
    md: {
      title: 'text-md sm:text-lg',
      subtitle: 'text-sm sm:text-base'
    },
    lg: {
      title: 'text-lg sm:text-xl',
      subtitle: 'text-base sm:text-lg'
    }
  };

  return (
    <div className={`${containerClasses[variant]} flex items-center justify-center p-4 ${className}`}>
      <div className="text-center max-w-md mx-auto">
        {/* Logo/Brand for brand variant */}
        {/* {variant === 'brand' && (
          <div className="mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-[#CE4520] rounded-full flex items-center justify-center mb-4">
              <span className="text-white font-bold text-lg sm:text-xl">IG</span>
            </div>
          </div>
        )} */}
        
        {/* Spinner */}
        <div className="mb-6 flex justify-center">
          <LoadingSpinner 
            size={spinnerSizes[size]} 
            color={variant === 'brand' ? 'primary' : 'primary'}
            aria-label={title}
          />
        </div>
        
        {/* Title */}
        <h2 className={`
          ${textSizes[size].title} 
          font-medium 
          text-gray-900 dark:text-gray-100 
          font-fira
          mb-2
        `}>
          {title}
        </h2>
        
        {/* Subtitle */}
        {subtitle && (
          <p className={`
            ${textSizes[size].subtitle} 
            text-gray-600 dark:text-gray-400 
            font-fira
            leading-relaxed
          `}>
            {subtitle}
          </p>
        )}
        
        {/* Progress indicator for brand variant */}
        {variant === 'brand' && (
          <div className="mt-8">
            <div className="w-32 sm:w-40 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-orange-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageLoader;