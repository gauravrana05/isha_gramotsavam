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
  Info,
  Send,
  Shield,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/component-patterns';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';

interface NotificationCenterProps {
  className?: string;
  maxNotifications?: number;
  showMarkAllAsRead?: boolean;
}

interface ApiNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  readAt?: Date | null;
  createdAt: Date;
  actionUrl?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  createdByUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'warning':
      return AlertCircle;
    case 'error':
      return AlertCircle;
    case 'team_invitation':
      return Users;
    case 'verification_update':
      return Shield;
    case 'match_result':
      return Trophy;
    case 'venue_assignment':
      return Calendar;
    case 'system_announcement':
      return Bell;
    case 'match_reminder':
      return Calendar;
    case 'tournament_update':
      return Trophy;
    default:
      return Info;
  }
};

const getNotificationStyles = (type: string) => {
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
    case 'system_announcement':
      return {
        bg: 'bg-red-50 border-red-200',
        icon: 'text-red-600',
        title: 'text-red-900',
        message: 'text-red-700',
      };
    case 'team_invitation':
    case 'verification_update':
      return {
        bg: 'bg-purple-50 border-purple-200',
        icon: 'text-purple-600',
        title: 'text-purple-900',
        message: 'text-purple-700',
      };
    case 'match_result':
    case 'tournament_update':
      return {
        bg: 'bg-green-50 border-green-200',
        icon: 'text-green-600',
        title: 'text-green-900',
        message: 'text-green-700',
      };
    case 'match_reminder':
      return {
        bg: 'bg-orange-50 border-orange-200',
        icon: 'text-orange-600',
        title: 'text-orange-900',
        message: 'text-orange-700',
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
  className,
  maxNotifications = 10,
  showMarkAllAsRead = true,
}) => {
  const { addNotification } = useNotification();
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch user notifications
  const { 
    data: notificationsData, 
    isLoading, 
    refetch 
  } = api.notifications.getMyNotifications.useQuery({
    limit: maxNotifications,
    offset: 0,
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = api.notifications.getUnreadCount.useQuery();

  // Mark as read mutation
  const markAsReadMutation = api.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = api.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
      addNotification('All notifications marked as read', 'success');
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    },
  });

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsReadMutation.mutateAsync({ notificationId });
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  const handleActionClick = (notification: ApiNotification) => {
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
    }
    
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
  };

  const notifications = notificationsData?.notifications || [];

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-gray-200 rounded mt-0.5"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        </div>
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No notifications yet</p>
        </div>
      </div>
    );
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
          {unreadCount > 0 && showMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isLoading}
              className="text-xs"
            >
              {markAllAsReadMutation.isLoading ? 'Marking...' : 'Mark all as read'}
            </Button>
          )}
          
          {notifications.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs"
            >
              {isExpanded ? 'Show Less' : 'Show All'}
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {(isExpanded ? notifications : notifications.slice(0, 3)).map((notification) => {
          const Icon = getNotificationIcon(notification.type);
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
                    
                    {notification.createdByUser && (
                      <div className="text-xs text-gray-500">
                        by {notification.createdByUser.firstName} {notification.createdByUser.lastName}
                      </div>
                    )}
                  </div>
                  
                  <p className={cn('text-sm mb-2', styles.message)}>
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(notification.createdAt)}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {notification.actionUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActionClick(notification)}
                          className="text-xs h-auto py-1 px-2"
                        >
                          View Details
                        </Button>
                      )}
                      
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsReadMutation.isLoading}
                          className="text-xs h-auto py-1 px-2"
                        >
                          {markAsReadMutation.isLoading ? 'Marking...' : 'Mark as read'}
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