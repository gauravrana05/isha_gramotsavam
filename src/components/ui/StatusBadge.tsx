import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Loader2,
  Info,
  Users,
  Play,
  Pause,
  StopCircle
} from 'lucide-react';
import { cn, BaseComponentProps } from '@/lib/component-patterns';

// Status type definitions
export type StatusType = 
  | 'active' 
  | 'inactive' 
  | 'pending' 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info'
  | 'loading'
  | 'available'
  | 'unavailable'
  | 'in_use'
  | 'maintenance'
  | 'registration_open'
  | 'registration_closed'
  | 'completed'
  | 'cancelled'
  | 'draft';

// Size variants
export type BadgeSize = 'sm' | 'base' | 'lg';

// StatusBadge props
export interface StatusBadgeProps extends BaseComponentProps {
  status: StatusType;
  size?: BadgeSize;
  showIcon?: boolean;
  customIcon?: React.ComponentType<{ className?: string }>;
  customLabel?: string;
  variant?: 'solid' | 'outline' | 'soft';
  pulse?: boolean; // For loading/active states
}

// Status configurations
const statusConfig = {
  active: {
    label: 'Active',
    icon: CheckCircle,
    colors: {
      solid: 'bg-green-600 text-white',
      outline: 'border-green-600 text-green-600 bg-transparent',
      soft: 'bg-green-100 text-green-800 border-green-200',
    },
  },
  inactive: {
    label: 'Inactive',
    icon: XCircle,
    colors: {
      solid: 'bg-red-600 text-white',
      outline: 'border-red-600 text-red-600 bg-transparent',
      soft: 'bg-red-100 text-red-800 border-red-200',
    },
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    colors: {
      solid: 'bg-yellow-600 text-white',
      outline: 'border-yellow-600 text-yellow-600 bg-transparent',
      soft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
  },
  success: {
    label: 'Success',
    icon: CheckCircle,
    colors: {
      solid: 'bg-green-600 text-white',
      outline: 'border-green-600 text-green-600 bg-transparent',
      soft: 'bg-green-100 text-green-800 border-green-200',
    },
  },
  error: {
    label: 'Error',
    icon: XCircle,
    colors: {
      solid: 'bg-red-600 text-white',
      outline: 'border-red-600 text-red-600 bg-transparent',
      soft: 'bg-red-100 text-red-800 border-red-200',
    },
  },
  warning: {
    label: 'Warning',
    icon: AlertCircle,
    colors: {
      solid: 'bg-yellow-600 text-white',
      outline: 'border-yellow-600 text-yellow-600 bg-transparent',
      soft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
  },
  info: {
    label: 'Info',
    icon: Info,
    colors: {
      solid: 'bg-blue-600 text-white',
      outline: 'border-blue-600 text-blue-600 bg-transparent',
      soft: 'bg-blue-100 text-blue-800 border-blue-200',
    },
  },
  loading: {
    label: 'Loading',
    icon: Loader2,
    colors: {
      solid: 'bg-gray-600 text-white',
      outline: 'border-gray-600 text-gray-600 bg-transparent',
      soft: 'bg-gray-100 text-gray-800 border-gray-200',
    },
  },
  available: {
    label: 'Available',
    icon: CheckCircle,
    colors: {
      solid: 'bg-green-600 text-white',
      outline: 'border-green-600 text-green-600 bg-transparent',
      soft: 'bg-green-100 text-green-800 border-green-200',
    },
  },
  unavailable: {
    label: 'Unavailable',
    icon: XCircle,
    colors: {
      solid: 'bg-red-600 text-white',
      outline: 'border-red-600 text-red-600 bg-transparent',
      soft: 'bg-red-100 text-red-800 border-red-200',
    },
  },
  in_use: {
    label: 'In Use',
    icon: Users,
    colors: {
      solid: 'bg-blue-600 text-white',
      outline: 'border-blue-600 text-blue-600 bg-transparent',
      soft: 'bg-blue-100 text-blue-800 border-blue-200',
    },
  },
  maintenance: {
    label: 'Maintenance',
    icon: AlertCircle,
    colors: {
      solid: 'bg-yellow-600 text-white',
      outline: 'border-yellow-600 text-yellow-600 bg-transparent',
      soft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
  },
  registration_open: {
    label: 'Registration Open',
    icon: CheckCircle,
    colors: {
      solid: 'bg-green-600 text-white',
      outline: 'border-green-600 text-green-600 bg-transparent',
      soft: 'bg-green-100 text-green-800 border-green-200',
    },
  },
  registration_closed: {
    label: 'Registration Closed',
    icon: StopCircle,
    colors: {
      solid: 'bg-red-600 text-white',
      outline: 'border-red-600 text-red-600 bg-transparent',
      soft: 'bg-red-100 text-red-800 border-red-200',
    },
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    colors: {
      solid: 'bg-green-600 text-white',
      outline: 'border-green-600 text-green-600 bg-transparent',
      soft: 'bg-green-100 text-green-800 border-green-200',
    },
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    colors: {
      solid: 'bg-red-600 text-white',
      outline: 'border-red-600 text-red-600 bg-transparent',
      soft: 'bg-red-100 text-red-800 border-red-200',
    },
  },
  draft: {
    label: 'Draft',
    icon: Pause,
    colors: {
      solid: 'bg-gray-600 text-white',
      outline: 'border-gray-600 text-gray-600 bg-transparent',
      soft: 'bg-gray-100 text-gray-800 border-gray-200',
    },
  },
};

// Size configurations
const sizeConfig = {
  sm: {
    container: 'px-2 py-0.5 text-xs',
    icon: 'w-3 h-3',
    gap: 'gap-1',
  },
  base: {
    container: 'px-2.5 py-0.5 text-xs',
    icon: 'w-4 h-4',
    gap: 'gap-1',
  },
  lg: {
    container: 'px-3 py-1 text-sm',
    icon: 'w-4 h-4',
    gap: 'gap-1.5',
  },
};

// Main StatusBadge component
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'base',
  showIcon = true,
  customIcon,
  customLabel,
  variant = 'soft',
  pulse = false,
  className,
  ...props
}) => {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  
  if (!config) {
    console.warn(`Unknown status: ${status}`);
    return null;
  }
  
  const Icon = customIcon || config.icon;
  const label = customLabel || config.label;
  const isLoading = status === 'loading';
  
  return (
    <span
      className={cn(
        // Base styles
        'inline-flex items-center font-medium rounded-full border transition-all duration-200',
        
        // Size styles
        sizeStyles.container,
        showIcon && sizeStyles.gap,
        
        // Color styles
        config.colors[variant],
        
        // Pulse animation for active/loading states
        (pulse || isLoading) && 'animate-pulse',
        
        // Custom className
        className
      )}
      {...props}
    >
      {showIcon && (
        <Icon 
          className={cn(
            sizeStyles.icon,
            isLoading && 'animate-spin'
          )} 
        />
      )}
      <span>{label}</span>
    </span>
  );
};

// Convenience components for common statuses
export const ActiveBadge = (props: Omit<StatusBadgeProps, 'status'>) => (
  <StatusBadge status="active" {...props} />
);

export const InactiveBadge = (props: Omit<StatusBadgeProps, 'status'>) => (
  <StatusBadge status="inactive" {...props} />
);

export const PendingBadge = (props: Omit<StatusBadgeProps, 'status'>) => (
  <StatusBadge status="pending" {...props} />
);

export const SuccessBadge = (props: Omit<StatusBadgeProps, 'status'>) => (
  <StatusBadge status="success" {...props} />
);

export const ErrorBadge = (props: Omit<StatusBadgeProps, 'status'>) => (
  <StatusBadge status="error" {...props} />
);

export const WarningBadge = (props: Omit<StatusBadgeProps, 'status'>) => (
  <StatusBadge status="warning" {...props} />
);

export const LoadingBadge = (props: Omit<StatusBadgeProps, 'status'>) => (
  <StatusBadge status="loading" {...props} />
);

// Helper function to get status badge component from status string
export const getStatusBadge = (
  status: StatusType, 
  props?: Omit<StatusBadgeProps, 'status'>
) => {
  return <StatusBadge status={status} {...props} />;
};

// Utility function to determine status from conditions (like in the original pages)
export const getVenueStatus = (venue: {
  isActive?: boolean;
  currentStatus?: 'available' | 'in_use' | 'maintenance' | 'unavailable';
}): StatusType => {
  if (!venue.isActive) return 'inactive';
  return venue.currentStatus || 'available';
};

export const getEventStatus = (event: {
  isActive?: boolean;
  isRegistrationOpen?: boolean;
  registrationStartDate?: any;
  registrationEndDate?: any;
}): StatusType => {
  if (!event.isActive) return 'inactive';
  
  // Check if registration is currently open based on dates
  const now = new Date();
  const regStart = event.registrationStartDate?.toDate?.() || null;
  const regEnd = event.registrationEndDate?.toDate?.() || null;
  
  let isRegOpen = event.isRegistrationOpen;
  
  if (regStart || regEnd) {
    if (!regStart && regEnd) {
      isRegOpen = now <= regEnd;
    } else if (regStart && !regEnd) {
      isRegOpen = now >= regStart;
    } else if (regStart && regEnd) {
      isRegOpen = now >= regStart && now <= regEnd;
    }
  }
  
  return isRegOpen ? 'registration_open' : 'registration_closed';
};

export default StatusBadge;