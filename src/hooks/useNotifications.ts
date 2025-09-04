'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';

export function useNotifications() {
  const { user } = useAuth();
  const [showPanel, setShowPanel] = useState(false);

  // Fetch user notifications
  const { 
    data: notificationData, 
    isLoading,
    refetch 
  } = api.notifications.getUserNotifications.useQuery(
    { userId: user?.id || '' },
    { 
      enabled: !!user?.id,
      refetchInterval: 30000 // Refetch every 30 seconds
    }
  );

  // Extract notifications array from API response (handle both old and new format)
  const notifications = Array.isArray(notificationData) 
    ? notificationData 
    : (notificationData?.notifications || []);

  // Calculate unread count (use API count if available, otherwise calculate)
  const unreadCount = notificationData?.unreadCount ?? notifications.filter(n => !n.read).length;

  // Mark notification as read mutation
  const markAsReadMutation = api.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = api.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  // Close notification panel
  const closePanel = () => {
    setShowPanel(false);
  };

  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsReadMutation.mutate({ notificationId: notification.id });
    }
    
    // Navigate to notification URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    
    setShowPanel(false);
  };

  // Handle mark as read
  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate({ notificationId });
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    if (user?.id) {
      markAllAsReadMutation.mutate({ userId: user.id });
    }
  };

  // Toggle notification panel
  const togglePanel = () => {
    setShowPanel(!showPanel);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    showPanel,
    togglePanel,
    closePanel,
    handleNotificationClick,
    handleMarkAsRead,
    handleMarkAllAsRead,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending
  };
}
