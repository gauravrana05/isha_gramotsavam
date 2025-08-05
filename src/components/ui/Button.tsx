import React, { forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn, BaseComponentProps, SizeVariant, focusClasses, disabledClasses } from '@/lib/component-patterns';
import { designTokens } from '@/lib/design-tokens';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'>, BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: SizeVariant;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  fullWidth?: boolean;
  rounded?: 'sm' | 'base' | 'lg' | 'full';
}

const sizeClasses = {
  sm: cn('h-9 px-3 text-sm gap-1.5', 'min-w-[36px]'),
  base: cn('h-11 px-4 text-base gap-2', 'min-w-[44px]'),
  lg: cn('h-12 px-6 text-lg gap-2', 'min-w-[48px]'),
  xl: cn('h-14 px-8 text-xl gap-3', 'min-w-[56px]'),
};

const variantClasses = {
  primary: cn(
    'bg-primary-500 text-white shadow-sm',
    'hover:bg-primary-600 hover:shadow-md',
    'active:bg-primary-700',
    'focus:ring-primary-500',
    'border border-transparent'
  ),
  secondary: cn(
    'bg-white text-secondary-900 shadow-sm',
    'border border-secondary-300',
    'hover:bg-secondary-50 hover:border-secondary-400',
    'active:bg-secondary-100',
    'focus:ring-secondary-500'
  ),
  outline: cn(
    'bg-transparent text-primary-600',
    'border border-primary-500',
    'hover:bg-primary-50 hover:border-primary-600',
    'active:bg-primary-100',
    'focus:ring-primary-500'
  ),
  ghost: cn(
    'bg-transparent text-secondary-700',
    'border border-transparent',
    'hover:bg-secondary-100',
    'active:bg-secondary-200',
    'focus:ring-secondary-500'
  ),
  danger: cn(
    'bg-red-600 text-white shadow-sm',
    'border border-transparent',
    'hover:bg-red-700 hover:shadow-md',
    'active:bg-red-800',
    'focus:ring-red-500'
  ),
  success: cn(
    'bg-green-600 text-white shadow-sm',
    'border border-transparent',
    'hover:bg-green-700 hover:shadow-md',
    'active:bg-green-800',
    'focus:ring-green-500'
  ),
};

const roundedClasses = {
  sm: 'rounded-sm',
  base: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
};

const LoadingSpinner = ({ size }: { size: SizeVariant }) => {
  const spinnerSizes = {
    sm: 'w-3 h-3',
    base: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  return (
    <Loader2 className={cn('animate-spin', spinnerSizes[size])} />
  );
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'base',
  loading = false,
  loadingText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  rounded = 'base',
  disabled,
  className,
  children,
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  const iconSizes = {
    sm: 'w-3 h-3',
    base: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  const buttonContent = loading ? (
    <>
      <LoadingSpinner size={size} />
      {loadingText || 'Loading...'}
    </>
  ) : (
    <>
      {LeftIcon && <LeftIcon className={iconSizes[size]} />}
      {children}
      {RightIcon && <RightIcon className={iconSizes[size]} />}
    </>
  );

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center',
        'font-medium font-fira tracking-wide',
        'transition-all duration-200 ease-in-out',
        'transform active:scale-[0.98]',
        focusClasses,
        disabledClasses,
        sizeClasses[size],
        variantClasses[variant],
        roundedClasses[rounded],
        fullWidth && 'w-full',
        loading && 'cursor-wait',
        className
      )}
      {...props}
    >
      {buttonContent}
    </button>
  );
});

Button.displayName = 'Button';

// --------------------------
// Named Variant Components
// --------------------------

export const PrimaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="primary" {...props} />
);
PrimaryButton.displayName = 'PrimaryButton';

export const SecondaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="secondary" {...props} />
);
SecondaryButton.displayName = 'SecondaryButton';

export const OutlineButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="outline" {...props} />
);
OutlineButton.displayName = 'OutlineButton';

export const GhostButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="ghost" {...props} />
);
GhostButton.displayName = 'GhostButton';

export const DangerButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="danger" {...props} />
);
DangerButton.displayName = 'DangerButton';

export const SuccessButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="success" {...props} />
);
SuccessButton.displayName = 'SuccessButton';


export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ComponentType<{ className?: string }>;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon: Icon,
  size = 'base',
  className,
  ...props
}, ref) => {
  const iconSizes = {
    sm: 'w-3 h-3',
    base: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  const squareSizes = {
    sm: 'w-9 h-9',
    base: 'w-11 h-11',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  };

  return (
    <Button
      ref={ref}
      size={size}
      className={cn(squareSizes[size], 'p-0', className)}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </Button>
  );
});
IconButton.displayName = 'IconButton';

export default Button;
