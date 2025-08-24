'use client'
import React, { useState } from 'react';
import { 
  Bell,
  X,
  Calendar,
  Users,
  FileText,
  Trophy,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/component-patterns';
import { Button } from '@/components/ui';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
  };
  read?: boolean;
}

interface NotificationCenterProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

const defaultNotifications: Notification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Document Verification Pending',
    message: 'Your Aadhaar documents are pending verification. This may take 2-3 business days.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    icon: FileText,
  },
  {
    id: '2',
    type: 'info',
    title: 'Match Schedule Released',
    message: 'Fixtures for the quarter-finals have been published. Check your match timings.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    icon: Calendar,
    action: {
      label: 'View Fixtures',
      onClick: () => {/* View fixtures */},
    },
  },
  {
    id: '3',
    type: 'success',
    title: 'Team Registration Approved',
    message: 'Your team "Thunder Bolts" has been approved for the football tournament.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    icon: CheckCircle,
    read: true,
  },
];

const getNotificationIcon = (type: Notification['type'], CustomIcon?: React.ComponentType<{ className?: string }>) => {
  if (CustomIcon) return CustomIcon;
  
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'warning':
      return AlertCircle;
    case 'error':
      return AlertCircle;
    default:
      return Info;
  }
};

const getNotificationStyles = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-green-50 border-green-200',
        icon: 'text-green-600',
        title: 'text-green-900',
        message: 'text-green-700',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50 border-yellow-200',
        icon: 'text-yellow-600',
        title: 'text-yellow-900',
        message: 'text-yellow-700',
      };
    case 'error':
      return {
        bg: 'bg-red-50 border-red-200',
        icon: 'text-red-600',
        title: 'text-red-900',
        message: 'text-red-700',
      };
    default:
      return {
        bg: 'bg-blue-50 border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        message: 'text-blue-700',
      };
  }
};

const formatTimestamp = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return timestamp.toLocaleDateString();
  }
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications = defaultNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && onMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Show Less' : 'Show All'}
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {(isExpanded ? notifications : notifications.slice(0, 3)).map((notification) => {
          const Icon = getNotificationIcon(notification.type, notification.icon);
          const styles = getNotificationStyles(notification.type);
          
          return (
            <div
              key={notification.id}
              className={cn(
                'border rounded-lg p-4 transition-all duration-200',
                styles.bg,
                !notification.read && 'ring-2 ring-blue-500/20',
                'relative'
              )}
            >
              {/* Unread indicator */}
              {!notification.read && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
              )}

              <div className="flex items-start gap-3">
                <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', styles.icon)} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={cn('font-medium text-sm', styles.title)}>
                      {notification.title}
                    </h3>
                    
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(notification.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <p className={cn('text-sm mb-2', styles.message)}>
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {notification.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={notification.action.onClick}
                          className="text-xs h-auto py-1 px-2"
                        >
                          {notification.action.label}
                        </Button>
                      )}
                      
                      {!notification.read && onMarkAsRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMarkAsRead(notification.id)}
                          className="text-xs h-auto py-1 px-2"
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more link */}
      {!isExpanded && notifications.length > 3 && (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(true)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            View {notifications.length - 3} more notifications
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;