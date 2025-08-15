import * as React from "react"
import { cn } from "@/lib/utils"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
}

const getAlertClasses = (variant: string = 'default') => {
  const baseClasses = "relative w-full rounded-lg border p-4";
  
  switch (variant) {
    case 'destructive':
      return `${baseClasses} border-red-200 bg-red-50 text-red-900`;
    case 'warning':
      return `${baseClasses} border-yellow-200 bg-yellow-50 text-yellow-900`;
    case 'success':
      return `${baseClasses} border-green-200 bg-green-50 text-green-900`;
    default:
      return `${baseClasses} border-gray-200 bg-gray-50 text-gray-900`;
  }
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(getAlertClasses(variant), className)}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };