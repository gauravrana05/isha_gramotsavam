import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

const getBadgeClasses = (variant: string = 'default') => {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2";
  
  switch (variant) {
    case 'secondary':
      return `${baseClasses} border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200`;
    case 'destructive':
      return `${baseClasses} border-transparent bg-red-500 text-white hover:bg-red-600`;
    case 'outline':
      return `${baseClasses} border-gray-200 text-gray-900 hover:bg-gray-50`;
    case 'success':
      return `${baseClasses} border-transparent bg-green-500 text-white hover:bg-green-600`;
    case 'warning':
      return `${baseClasses} border-transparent bg-yellow-500 text-white hover:bg-yellow-600`;
    default:
      return `${baseClasses} border-transparent bg-blue-500 text-white hover:bg-blue-600`;
  }
};

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div className={cn(getBadgeClasses(variant), className)} {...props} />
  )
}

export { Badge }