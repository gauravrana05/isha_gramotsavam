import React from 'react';
import { 
  MapPin, 
  Calendar, 
  Users, 
  FileText, 
  Image, 
  Search, 
  Database,
  Inbox,
  AlertCircle,
  Plus
} from 'lucide-react';
import { cn, BaseComponentProps } from '@/lib/component-patterns';
import Button from './Button';

// Empty state props
export interface EmptyStateProps extends BaseComponentProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    icon?: React.ComponentType<{ className?: string }>;
  };
  size?: 'sm' | 'base' | 'lg';
  variant?: 'default' | 'minimal' | 'illustration';
}

// Predefined empty state types for common scenarios
export type EmptyStateType = 
  | 'no_data'
  | 'no_results' 
  | 'no_venues'
  | 'no_events'
  | 'no_teams'
  | 'no_matches'
  | 'no_files'
  | 'no_images'
  | 'no_notifications'
  | 'error'
  | 'loading'
  | 'custom';

// Predefined configurations for common empty states
const presetConfigs = {
  no_data: {
    icon: Database,
    title: 'No data available',
    description: 'There is no data to display at this time.',
  },
  no_results: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search criteria or filters.',
  },
  no_venues: {
    icon: MapPin,
    title: 'No venues found',
    description: 'Create your first venue to get started.',
  },
  no_events: {
    icon: Calendar,
    title: 'No events found',
    description: 'Create your first event to get started.',
  },
  no_teams: {
    icon: Users,
    title: 'No teams found',
    description: 'Teams will appear here once they register.',
  },
  no_matches: {
    icon: Calendar,
    title: 'No matches scheduled',
    description: 'Matches will appear here once they are scheduled.',
  },
  no_files: {
    icon: FileText,
    title: 'No files uploaded',
    description: 'Upload your first file to get started.',
  },
  no_images: {
    icon: Image,
    title: 'No images found',
    description: 'Upload images to see them here.',
  },
  no_notifications: {
    icon: Inbox,
    title: 'All caught up!',
    description: 'You have no new notifications.',
  },
  error: {
    icon: AlertCircle,
    title: 'Something went wrong',
    description: 'Please try again or contact support if the problem persists.',
  },
};

// Size configurations
const sizeClasses = {
  sm: {
    container: 'py-8',
    icon: 'w-8 h-8',
    title: 'text-base',
    description: 'text-sm',
    spacing: 'space-y-3',
  },
  base: {
    container: 'py-12',
    icon: 'w-12 h-12',
    title: 'text-lg',
    description: 'text-base',
    spacing: 'space-y-4',
  },
  lg: {
    container: 'py-16',
    icon: 'w-16 h-16',
    title: 'text-xl',
    description: 'text-lg',
    spacing: 'space-y-6',
  },
};

// Variant styles
const variantClasses = {
  default: 'bg-white rounded-lg border border-gray-200 text-center',
  minimal: 'text-center',
  illustration: 'bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-center',
};

// Main EmptyState component
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  size = 'base',
  variant = 'default',
  className,
  ...props
}) => {
  const sizeConfig = sizeClasses[size];
  
  return (
    <div
      className={cn(
        variantClasses[variant],
        sizeConfig.container,
        className
      )}
      {...props}
    >
      <div className={cn('mx-auto max-w-md', sizeConfig.spacing)}>
        {/* Icon */}
        {Icon && (
          <div className="flex justify-center">
            <Icon className={cn(sizeConfig.icon, 'text-gray-400')} />
          </div>
        )}
        
        {/* Title */}
        <h3 className={cn(
          'font-semibold text-gray-900 font-fira',
          sizeConfig.title
        )}>
          {title}
        </h3>
        
        {/* Description */}
        <p className={cn(
          'text-gray-600 font-fira',
          sizeConfig.description
        )}>
          {description}
        </p>
        
        {/* Action button */}
        {action && (
          <div className="flex justify-center">
            <Button
              variant={action.variant || 'primary'}
              onClick={action.onClick}
              leftIcon={action.icon}
              size={size === 'lg' ? 'lg' : 'base'}
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Preset empty state component
export interface PresetEmptyStateProps extends Omit<EmptyStateProps, 'icon' | 'title' | 'description'> {
  type: EmptyStateType;
  title?: string; // Override default title
  description?: string; // Override default description
}

export const PresetEmptyState: React.FC<PresetEmptyStateProps> = ({
  type,
  title,
  description,
  ...props
}) => {
  const config = presetConfigs[type as keyof typeof presetConfigs];

  if (!config && type !== 'custom') {
    // Warning removed
    return null;
  }
  
  return (
    <EmptyState
      icon={config?.icon}
      title={title || config?.title || 'No data'}
      description={description || config?.description || 'No data available'}
      {...props}
    />
  );
};

// Convenience components for common use cases
export const NoVenuesState: React.FC<Omit<EmptyStateProps, 'icon' | 'title' | 'description'>> = (props) => (
  <PresetEmptyState type="no_venues" {...props} />
);

export const NoEventsState: React.FC<Omit<EmptyStateProps, 'icon' | 'title' | 'description'>> = (props) => (
  <PresetEmptyState type="no_events" {...props} />
);

export const NoTeamsState: React.FC<Omit<EmptyStateProps, 'icon' | 'title' | 'description'>> = (props) => (
  <PresetEmptyState type="no_teams" {...props} />
);

export const NoMatchesState: React.FC<Omit<EmptyStateProps, 'icon' | 'title' | 'description'>> = (props) => (
  <PresetEmptyState type="no_matches" {...props} />
);

export const NoResultsState: React.FC<Omit<EmptyStateProps, 'icon' | 'title' | 'description'>> = (props) => (
  <PresetEmptyState type="no_results" {...props} />
);

export const ErrorState: React.FC<Omit<EmptyStateProps, 'icon' | 'title' | 'description'>> = (props) => (
  <PresetEmptyState type="error" {...props} />
);

// Admin-specific empty states with create actions
export const AdminEmptyState: React.FC<{
  type: 'venues' | 'events' | 'teams' | 'matches';
  onCreateClick: () => void;
  size?: EmptyStateProps['size'];
  variant?: EmptyStateProps['variant'];
}> = ({ type, onCreateClick, size = 'base', variant = 'default' }) => {
  const configs = {
    venues: {
      icon: MapPin,
      title: 'No venues found',
      description: 'Create your first venue to get started.',
      actionLabel: 'Add Venue',
    },
    events: {
      icon: Calendar,
      title: 'No events found',
      description: 'Create your first event to get started.',
      actionLabel: 'Add Event',
    },
    teams: {
      icon: Users,
      title: 'No teams registered',
      description: 'Teams will appear here once they register for events.',
      actionLabel: 'View Registration',
    },
    matches: {
      icon: Calendar,
      title: 'No matches scheduled',
      description: 'Matches will appear here once they are scheduled.',
      actionLabel: 'Schedule Match',
    },
  };
  
  const config = configs[type];
  
  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      action={{
        label: config.actionLabel,
        onClick: onCreateClick,
        variant: 'primary',
        icon: Plus,
      }}
      size={size}
      variant={variant}
    />
  );
};

// Loading empty state with skeleton-like appearance
export const LoadingEmptyState: React.FC<{
  title?: string;
  description?: string;
  size?: EmptyStateProps['size'];
}> = ({ 
  title = 'Loading...', 
  description = 'Please wait while we fetch your data.',
  size = 'base' 
}) => (
  <div className={cn(
    'bg-white rounded-lg border border-gray-200 text-center',
    sizeClasses[size].container
  )}>
    <div className={cn('mx-auto max-w-md', sizeClasses[size].spacing)}>
      {/* Animated loading icon */}
      <div className="flex justify-center">
        <div className={cn(
          'animate-spin rounded-full border-2 border-gray-300 border-t-primary-500',
          sizeClasses[size].icon
        )} />
      </div>
      
      <h3 className={cn(
        'font-semibold text-gray-900 font-fira',
        sizeClasses[size].title
      )}>
        {title}
      </h3>
      
      <p className={cn(
        'text-gray-600 font-fira',
        sizeClasses[size].description
      )}>
        {description}
      </p>
    </div>
  </div>
);

export default EmptyState;