import React from 'react';

export interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'list' | 'table';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
  animate?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
  animate = true
}) => {
  const baseClasses = `
    bg-gray-200 dark:bg-gray-700 
    ${animate ? 'animate-pulse' : ''}
    ${className}
  `;

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circular':
        return 'rounded-full aspect-square';
      case 'rectangular':
        return 'rounded-lg';
      case 'card':
        return 'rounded-lg h-48';
      case 'list':
        return 'h-12 rounded-lg';
      case 'table':
        return 'h-8 rounded';
      default:
        return 'h-4 rounded';
    }
  };

  const getVariantDefaults = () => {
    switch (variant) {
      case 'text':
        return { width: '100%', height: '1rem' };
      case 'circular':
        return { width: '3rem', height: '3rem' };
      case 'rectangular':
        return { width: '100%', height: '8rem' };
      case 'card':
        return { width: '100%', height: '12rem' };
      case 'list':
        return { width: '100%', height: '3rem' };
      case 'table':
        return { width: '100%', height: '2rem' };
      default:
        return { width: '100%', height: '1rem' };
    }
  };

  const defaults = getVariantDefaults();
  const finalWidth = width || defaults.width;
  const finalHeight = height || defaults.height;

  const style = {
    width: typeof finalWidth === 'number' ? `${finalWidth}px` : finalWidth,
    height: typeof finalHeight === 'number' ? `${finalHeight}px` : finalHeight,
  };

  // Card variant with complex layout
  if (variant === 'card') {
    return (
      <div className={`${baseClasses} p-4 space-y-4`} style={style}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // List variant with avatar and content
  if (variant === 'list') {
    const items = Array.from({ length: count }, (_, index) => (
      <div key={index} className={`${baseClasses} p-3 flex items-center space-x-3`} style={style}>
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    ));
    
    return count === 1 ? items[0] : <div className="space-y-2">{items}</div>;
  }

  // Table variant with rows and columns
  if (variant === 'table') {
    const rows = Array.from({ length: count }, (_, index) => (
      <tr key={index}>
        <td className="px-4 py-2">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        </td>
        <td className="px-4 py-2">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </td>
        <td className="px-4 py-2">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
        </td>
      </tr>
    ));

    return (
      <div className="w-full">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              </th>
              <th className="px-4 py-2 text-left">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
              </th>
              <th className="px-4 py-2 text-left">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
              </th>
            </tr>
          </thead>
          <tbody className={animate ? 'animate-pulse' : ''}>{rows}</tbody>
        </table>
      </div>
    );
  }

  // Standard variants (text, circular, rectangular)
  const items = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`${baseClasses} ${getVariantClasses()}`}
      style={style}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  ));

  return count === 1 ? items[0] : <div className="space-y-2">{items}</div>;
};

// Preset skeleton components for common use cases
export const TextSkeleton: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = (props) => (
  <SkeletonLoader variant="text" {...props} />
);

export const AvatarSkeleton: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = (props) => (
  <SkeletonLoader variant="circular" width="3rem" height="3rem" {...props} />
);

export const CardSkeleton: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = (props) => (
  <SkeletonLoader variant="card" {...props} />
);

export const ListSkeleton: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = (props) => (
  <SkeletonLoader variant="list" {...props} />
);

export const TableSkeleton: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = (props) => (
  <SkeletonLoader variant="table" {...props} />
);

export default SkeletonLoader;