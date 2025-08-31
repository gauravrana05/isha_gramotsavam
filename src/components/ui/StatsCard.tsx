import React, { ReactNode } from 'react';
import { cn, BaseComponentProps, ColorVariant } from '@/lib/component-patterns';

// Individual stat item interface
export interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  color?: ColorVariant;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  description?: string;
  onClick?: () => void;
}

// Stats grid props
export interface StatsCardProps extends BaseComponentProps {
  stats: StatItem[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'sm' | 'base' | 'lg';
  showBorder?: boolean;
  showShadow?: boolean;
}

// Individual stat card props - support both patterns
export interface SingleStatCardProps extends BaseComponentProps {
  stat?: StatItem;
  // Individual props for backward compatibility
  title?: string;
  value?: string | number;
  icon?: React.ReactNode;
  color?: string;
  trend?: string;
  description?: string;
  // Component props
  size?: 'sm' | 'base' | 'lg';
  showBorder?: boolean;
  showShadow?: boolean;
}

// Color classes for different stat types
const colorClasses = {
  primary: {
    value: 'text-[#F28C38]',
    bg: 'bg-orange-50',
    icon: 'text-[#F28C38]',
  },
  secondary: {
    value: 'text-[#4A2F1D]',
    bg: 'bg-amber-50',
    icon: 'text-[#4A2F1D]',
  },
  success: {
    value: 'text-green-600',
    bg: 'bg-green-50',
    icon: 'text-green-600',
  },
  error: {
    value: 'text-red-600',
    bg: 'bg-red-50', 
    icon: 'text-red-600',
  },
  warning: {
    value: 'text-yellow-600',
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
  },
  info: {
    value: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
  },
  gray: {
    value: 'text-gray-600',
    bg: 'bg-gray-50',
    icon: 'text-gray-600',
  },
};

// Size classes for different stat card sizes
const sizeClasses = {
  sm: {
    container: 'p-3',
    value: 'text-lg font-semibold',
    label: 'text-xs',
    icon: 'w-4 h-4',
    trend: 'text-xs',
  },
  base: {
    container: 'p-4',
    value: 'text-2xl font-bold',
    label: 'text-sm',
    icon: 'w-5 h-5',
    trend: 'text-sm',
  },
  lg: {
    container: 'p-6',
    value: 'text-3xl font-bold',
    label: 'text-base',
    icon: 'w-6 h-6',
    trend: 'text-base',
  },
};

// Grid column classes
const gridClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

// Trend indicator component
const TrendIndicator = ({ 
  trend, 
  size = 'base' 
}: { 
  trend: StatItem['trend']; 
  size?: 'sm' | 'base' | 'lg';
}) => {
  if (!trend) return null;

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
    const iconClass = sizeClasses[size].icon;
    
    if (direction === 'up') {
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (direction === 'down') {
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    
    return (
      <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className={cn(
      'flex items-center gap-1 mt-1',
      sizeClasses[size].trend,
      trendColors[trend.direction]
    )}>
      <TrendIcon direction={trend.direction} />
      <span className="font-medium">{trend.value}%</span>
      <span className="text-gray-500">{trend.label}</span>
    </div>
  );
};

// Single stat card component
export const SingleStatCard: React.FC<SingleStatCardProps> = ({
  stat,
  title,
  value,
  icon,
  color,
  trend,
  description,
  size = 'base',
  showBorder = true,
  showShadow = false,
  className,
  ...props
}) => {
  // Support both patterns: stat object or individual props
  const statData = stat || {
    label: title || '',
    value: value || '',
    icon: icon,
    color: color || 'gray',
    trend,
    description,
  };
  
  const statColor = statData.color || 'gray';
  const colors = colorClasses[statColor];
  const sizes = sizeClasses[size];
  
  const CardContent = () => (
    <div className={cn(
      'bg-white rounded-lg text-center transition-all duration-200',
      sizes.container,
      showBorder && 'border border-gray-200',
      showShadow && 'shadow-sm hover:shadow-md',
      statData.onClick && 'cursor-pointer hover:bg-gray-50',
      className
    )}>
      {/* Icon */}
      {statData.icon && (
        <div className={cn('flex justify-center mb-2')}>
          <div className={cn(
            'p-2 rounded-full',
            colors.bg
          )}>
            <statData.icon className={cn(sizes.icon, colors.icon)} />
          </div>
        </div>
      )}
      
      {/* Value */}
      <div className={cn(sizes.value, colors.value)}>
        {typeof statData.value === 'number' ? statData.value.toLocaleString() : statData.value}
      </div>
      
      {/* Label */}
      <div className={cn(sizes.label, 'text-gray-600 font-medium mt-1')}>
        {statData.label}
      </div>
      
      {/* Description */}
      {statData.description && (
        <div className={cn(sizeClasses.sm.label, 'text-gray-500 mt-1')}>
          {statData.description}
        </div>
      )}
      
      {/* Trend */}
      <TrendIndicator trend={statData.trend} size={size} />
    </div>
  );
  
  if (statData.onClick) {
    return (
      <button onClick={statData.onClick} className="w-full text-left" {...props}>
        <CardContent />
      </button>
    );
  }
  
  return (
    <div {...props}>
      <CardContent />
    </div>
  );
};

// Main stats grid component
export const StatsCard: React.FC<StatsCardProps> = ({
  stats,
  columns = 4,
  size = 'base',
  showBorder = true,
  showShadow = false,
  className,
  children,
  ...props
}) => {
  return (
    <div 
      className={cn(
        'grid gap-4',
        gridClasses[columns],
        className
      )}
      {...props}
    >
      {stats.map((stat, index) => (
        <SingleStatCard
          key={index}
          stat={stat}
          size={size}
          showBorder={showBorder}
          showShadow={showShadow}
        />
      ))}
      {children}
    </div>
  );
};

// Export both components
export default StatsCard;