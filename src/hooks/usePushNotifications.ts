'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PushNotificationService, PushNotificationData } from '@/lib/services/pushNotifications';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    subscription: null,
    isLoading: true,
    error: null
  });

  const [service] = useState(() => new PushNotificationService());

  // Initialize push notification state
  useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        const isSupported = service.isSupported();
        const permission = Notification.permission;
        
        let subscription = null;
        let isSubscribed = false;

        if (isSupported && permission === 'granted') {
          subscription = await service.getSubscription();
          isSubscribed = !!subscription;
        }

        setState(prev => ({
          ...prev,
          isSupported,
          permission,
          isSubscribed,
          subscription,
          isLoading: false
        }));
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to initialize push notifications'
        }));
      }
    };

    initializePushNotifications();
  }, [service]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const subscription = await service.subscribeToPush(user.id);
      const permission = Notification.permission;

      setState(prev => ({
        ...prev,
        permission,
        isSubscribed: !!subscription,
        subscription,
        isLoading: false
      }));

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe'
      }));
      throw error;
    }
  }, [user?.id, service]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const success = await service.unsubscribe();

      if (success) {
        setState(prev => ({
          ...prev,
          isSubscribed: false,
          subscription: null,
          isLoading: false
        }));
      } else {
        throw new Error('Failed to unsubscribe');
      }

      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe'
      }));
      throw error;
    }
  }, [service]);

  // Request permission
  const requestPermission = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const permission = await service.requestPermission();

      setState(prev => ({
        ...prev,
        permission,
        isLoading: false
      }));

      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to request permission'
      }));
      throw error;
    }
  }, [service]);

  // Show local notification
  const showLocalNotification = useCallback(async (data: PushNotificationData) => {
    try {
      await service.showLocalNotification(data);
    } catch (error) {
      console.error('Failed to show local notification:', error);
      throw error;
    }
  }, [service]);

  // Check if notifications should be prompted
  const shouldPromptForNotifications = useCallback(() => {
    return (
      state.isSupported &&
      state.permission === 'default' &&
      !state.isSubscribed &&
      user?.role &&
      ['captain', 'player'].includes(user.role)
    );
  }, [state.isSupported, state.permission, state.isSubscribed, user?.role]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    requestPermission,
    showLocalNotification,
    shouldPromptForNotifications
  };
}
