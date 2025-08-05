import React, { forwardRef, ReactNode } from 'react';
import { cn, BaseComponentProps, CompoundComponentType } from '@/lib/component-patterns';

// Card component props
export interface CardProps extends BaseComponentProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';
  size?: 'sm' | 'base' | 'lg';
  padding?: 'none' | 'sm' | 'base' | 'lg';
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

// Card header props
export interface CardHeaderProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  divider?: boolean;
}

// Card content props
export interface CardContentProps extends BaseComponentProps {
  size?: 'sm' | 'base' | 'lg';
}

// Card footer props
export interface CardFooterProps extends BaseComponentProps {
  divider?: boolean;
  align?: 'left' | 'center' | 'right' | 'between';
}

// Variant styles
const variantClasses = {
  default: 'bg-white border border-gray-200 shadow-sm',
  outlined: 'bg-white border-2 border-gray-300',
  elevated: 'bg-white border border-gray-200 shadow-lg',
  ghost: 'bg-transparent border-none shadow-none',
};

// Size styles (affects border radius and overall spacing)
const sizeClasses = {
  sm: 'rounded-md',
  base: 'rounded-lg',
  lg: 'rounded-xl',
};

// Padding styles
const paddingClasses = {
  none: '',
  sm: 'p-3',
  base: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

// Main Card component
const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  size = 'base',
  padding = 'base',
  hover = false,
  clickable = false,
  onClick,
  className,
  children,
  ...props
}, ref) => {
  const isInteractive = clickable || onClick;
  
  const CardElement = isInteractive ? 'button' : 'div';
  
  return (
    <CardElement
      ref={ref as any}
      onClick={onClick}
      className={cn(
        // Base styles
        'relative overflow-hidden transition-all duration-200',
        
        // Variant styles
        variantClasses[variant],
        
        // Size styles
        sizeClasses[size],
        
        // Padding styles
        paddingClasses[padding],
        // Interactive styles
        ...(isInteractive
          ? [
              'cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              hover && 'hover:shadow-md hover:border-gray-300',
              'active:scale-[0.99] active:shadow-sm',
            ].filter(Boolean)
          : []),

        // Hover effect for non-interactive cards
        !isInteractive && hover && 'hover:shadow-md transition-shadow',
        className
      )}
      {...props}
    >
      {children}
    </CardElement>
  );
});

Card.displayName = 'Card';

// Card Header component
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(({
  title,
  subtitle,
  action,
  divider = true,
  className,
  children,
  ...props
}, ref) => {
  const hasContent = title || subtitle || children;
  
  if (!hasContent && !action) return null;
  
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-start justify-between gap-4',
        'px-6 py-4',
        divider && 'border-b border-gray-200',
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 font-fira truncate">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="mt-1 text-sm text-gray-600 font-roboto">
            {subtitle}
          </p>
        )}
        {children}
      </div>
      
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

// Card Content component
export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({
  size = 'base',
  className,
  children,
  ...props
}, ref) => {
  const sizeStyles = {
    sm: 'px-4 py-3',
    base: 'px-6 py-4',
    lg: 'px-8 py-6',
  };
  
  return (
    <div
      ref={ref}
      className={cn(
        'flex-1',
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

// Card Footer component
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(({
  divider = true,
  align = 'right',
  className,
  children,
  ...props
}, ref) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };
  
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3',
        'px-6 py-4',
        alignClasses[align],
        divider && 'border-t border-gray-200 bg-gray-50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';

// Add compound components to Card
const CardWithCompounds = Card as unknown as CompoundComponentType<CardProps>;
CardWithCompounds.Header = CardHeader;
CardWithCompounds.Content = CardContent;
CardWithCompounds.Footer = CardFooter;

// Specialized card variants for common use cases

// Admin list item card (used in admin tables mobile view)
export interface AdminCardProps extends Omit<CardProps, 'variant'> {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  actions?: ReactNode;
  fields?: Array<{
    label: string;
    value: ReactNode;
  }>;
}

export const AdminCard = forwardRef<HTMLDivElement, AdminCardProps>(({
  title,
  subtitle,
  status,
  actions,
  fields = [],
  children,
  ...props
}, ref) => {
  return (
    <Card ref={ref} hover clickable {...props}>
      {/* Header with title and status */}
      <CardHeader divider={false}>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 font-fira truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-gray-600 font-roboto mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {status && (
              <div className="flex-shrink-0 ml-4">
                {status}
              </div>
            )}
          </div>
          
          {/* Fields grid for mobile */}
          {fields.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {fields.map((field, index) => (
                <div key={index}>
                  <dt className="text-xs text-gray-500 font-medium">
                    {field.label}
                  </dt>
                  <dd className="text-sm font-medium text-gray-900 mt-1">
                    {field.value}
                  </dd>
                </div>
              ))}
            </div>
          )}
          
          {children}
        </div>
      </CardHeader>
      
      {/* Actions footer */}
      {actions && (
        <CardFooter align="right" divider>
          {actions}
        </CardFooter>
      )}
    </Card>
  );
});

AdminCard.displayName = 'AdminCard';

// Stats card (already have StatsCard, but simple version for quick use)
export interface SimpleStatsCardProps extends Omit<CardProps, 'children'> {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

export const SimpleStatsCard = forwardRef<HTMLDivElement, SimpleStatsCardProps>(({
  label,
  value,
  icon: Icon,
  trend,
  ...props
}, ref) => {
  return (
    <Card ref={ref} variant="default" size="base" padding="base" {...props}>
      <div className="text-center">
        {Icon && (
          <div className="flex justify-center mb-3">
            <div className="p-2 bg-primary-50 rounded-full">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
          </div>
        )}
        
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        <div className="text-sm text-gray-600 font-medium">
          {label}
        </div>
        
        {trend && (
          <div className={cn(
            'flex items-center justify-center gap-1 mt-2 text-xs',
            trend.direction === 'up' ? 'text-green-600' : 
            trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
          )}>
            <span>{trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}</span>
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
    </Card>
  );
});

SimpleStatsCard.displayName = 'SimpleStatsCard';

export { CardWithCompounds as Card };
export default CardWithCompounds;