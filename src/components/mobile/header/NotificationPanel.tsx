'use client';

import { X, CheckCircle, AlertCircle, Users, Trophy, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/component-patterns';

interface NotificationPanelProps {
  notifications: any[];
  onClose: () => void;
  onMarkRead: (notificationId: string) => void;
  onNotificationClick: (notification: any) => void;
}

export function NotificationPanel({ 
  notifications, 
  onClose, 
  onMarkRead, 
  onNotificationClick 
}: NotificationPanelProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'team':
        return <Users size={16} className="text-blue-500" />;
      case 'match':
        return <Trophy size={16} className="text-green-500" />;
      case 'verification':
        return <CheckCircle size={16} className="text-orange-500" />;
      case 'chat':
        return <MessageCircle size={16} className="text-purple-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="fixed top-16 right-4 left-4 bg-white rounded-lg shadow-lg max-h-96 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-80">
          {notifications.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => onNotificationClick(notification)}
                  className={cn(
                    'p-4 cursor-pointer hover:bg-gray-50 transition-colors',
                    !notification.read && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm',
                        !notification.read ? 'font-medium text-gray-900' : 'text-gray-700'
                      )}>
                        {notification.title}
                      </p>
                      
                      {notification.message && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {getTimeAgo(notification.createdAt)}
                        </span>
                        
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkRead(notification.id);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications</p>
              <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                notifications.forEach(n => !n.read && onMarkRead(n.id));
              }}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
