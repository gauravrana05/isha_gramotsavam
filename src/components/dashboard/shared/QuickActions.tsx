'use client'
import React from 'react';
import { 
  Plus,
  Users,
  Calendar,
  Upload,
  FileText,
  Settings,
  MapPin,
  Trophy,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/component-patterns';
import { Button } from '@/components/ui';

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  disabled?: boolean;
  badge?: string | number;
}

interface QuickActionsProps {
  role: 'captain' | 'player';
  actions?: QuickAction[];
  onCreateTeam?: () => void;
  onManagePlayers?: () => void;
  onViewFixtures?: () => void;
  onUploadDocuments?: () => void;
  onViewProfile?: () => void;
  onViewTeams?: () => void;
  onViewMatches?: () => void;
  className?: string;
}

const getCaptainActions = (props: QuickActionsProps): QuickAction[] => [
  {
    id: 'create-team',
    label: 'Create Team',
    description: 'Start a new team',
    icon: Plus,
    onClick: props.onCreateTeam || (() => {}),
    variant: 'primary',
  },
  {
    id: 'manage-players',
    label: 'Manage Players',
    description: 'Add or remove players',
    icon: Users,
    onClick: props.onManagePlayers || (() => {}),
    variant: 'secondary',
  },
  {
    id: 'view-fixtures',
    label: 'View Fixtures',
    description: 'Check match schedule',
    icon: Calendar,
    onClick: props.onViewFixtures || (() => {}),
    variant: 'secondary',
  },
  {
    id: 'view-profile',
    label: 'Profile & Settings',
    description: 'Manage your account',
    icon: Settings,
    onClick: props.onViewProfile || (() => {}),
    variant: 'secondary',
  },
];

const getPlayerActions = (props: QuickActionsProps): QuickAction[] => [
  {
    id: 'upload-documents',
    label: 'Upload Documents',
    description: 'Complete verification',
    icon: Upload,
    onClick: props.onUploadDocuments || (() => {}),
    variant: 'warning',
  },
  {
    id: 'view-teams',
    label: 'My Teams',
    description: 'View team memberships',
    icon: Users,
    onClick: props.onViewTeams || (() => {}),
    variant: 'secondary',
  },
  {
    id: 'view-matches',
    label: 'Matches',
    description: 'Check match schedule',
    icon: Trophy,
    onClick: props.onViewMatches || (() => {}),
    variant: 'secondary',
  },
  {
    id: 'view-profile',
    label: 'Profile & Settings',
    description: 'Manage your account',
    icon: Settings,
    onClick: props.onViewProfile || (() => {}),
    variant: 'secondary',
  },
];

const getVariantStyles = (variant: QuickAction['variant']) => {
  switch (variant) {
    case 'primary':
      return {
        button: 'bg-primary-500 hover:bg-primary-600 text-white',
        icon: 'text-white',
      };
    case 'success':
      return {
        button: 'bg-green-500 hover:bg-green-600 text-white',
        icon: 'text-white',
      };
    case 'warning':
      return {
        button: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        icon: 'text-white',
      };
    default:
      return {
        button: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200',
        icon: 'text-gray-600',
      };
  }
};

export const QuickActions: React.FC<QuickActionsProps> = ({
  role,
  actions: customActions,
  className,
  ...props
}) => {
  const defaultActions = role === 'captain' 
    ? getCaptainActions({ ...props, role })
    : getPlayerActions({ ...props, role });
  
  const actions = customActions || defaultActions;

  return (
    <div className={cn('space-y-4', className)}>
      <h2 className="text-lg font-semibold text-gray-900">
        Quick Actions
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const styles = getVariantStyles(action.variant);
          
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                'w-full p-4 rounded-lg text-left transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'group relative',
                styles.button
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-lg flex-shrink-0',
                  action.variant === 'secondary' 
                    ? 'bg-gray-100 group-hover:bg-gray-200' 
                    : 'bg-white/20'
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    action.variant === 'secondary' ? 'text-gray-600' : styles.icon
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm">
                      {action.label}
                    </h3>
                    
                    {action.badge && (
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        action.variant === 'secondary'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-white/20 text-white'
                      )}>
                        {action.badge}
                      </span>
                    )}
                  </div>
                  
                  {action.description && (
                    <p className={cn(
                      'text-xs',
                      action.variant === 'secondary'
                        ? 'text-gray-500'
                        : 'text-white/80'
                    )}>
                      {action.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;