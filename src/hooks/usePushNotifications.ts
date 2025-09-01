'use client'
import { useState, useEffect, useCallback } from 'react';
import { pushNotificationService, type PushSubscriptionData, type NotificationSettings } from '@/lib/services/pushNotifications';
import { api } from '@/lib/api';

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  subscription: PushSubscriptionData | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  testNotification: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API mutations
  const updateSettingsMutation = api.notifications.updateSettings.useMutation();

  // Check initial state
  useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check support
        const supported = pushNotificationService.isPushSupported();
        setIsSupported(supported);

        if (!supported) {
          setIsLoading(false);
          return;
        }

        // Get current permission
        const currentPermission = pushNotificationService.getPermissionStatus();
        setPermission(currentPermission);

        // Initialize service worker
        await pushNotificationService.initializeServiceWorker();

        // Check existing subscription
        const currentSubscription = await pushNotificationService.getCurrentSubscription();
        setSubscription(currentSubscription);
        setIsSubscribed(!!currentSubscription);

        // Setup message listener for service worker communication
        pushNotificationService.setupMessageListener();

      } catch (err) {
        console.error('Failed to initialize push notifications:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize push notifications');
      } finally {
        setIsLoading(false);
      }
    };

    initializePushNotifications();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      if (!isSupported) {
        throw new Error('Push notifications are not supported in this browser');
      }

      const granted = await pushNotificationService.requestPermission();
      setPermission(granted);

      return granted === 'granted';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permission';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      if (!isSupported) {
        throw new Error('Push notifications are not supported');
      }

      // For demo purposes, using a placeholder VAPID key
      // In production, this should come from your environment variables
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'demo-key';
      
      if (vapidPublicKey === 'demo-key') {
        console.warn('Using demo VAPID key. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in production.');
      }

      const pushSubscription = await pushNotificationService.subscribeToPush(vapidPublicKey);
      setSubscription(pushSubscription);
      setIsSubscribed(true);

      // Update settings in the backend
      await updateSettingsMutation.mutateAsync({
        pushEnabled: true,
        pushSubscription: pushSubscription as any,
      });

      // Register for background sync
      await pushNotificationService.registerBackgroundSync();

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to push notifications';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, updateSettingsMutation]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      const success = await pushNotificationService.unsubscribeFromPush();
      
      if (success) {
        setSubscription(null);
        setIsSubscribed(false);

        // Update settings in the backend
        await updateSettingsMutation.mutateAsync({
          pushEnabled: false,
          pushSubscription: null,
        });
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsubscribe from push notifications';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [updateSettingsMutation]);

  // Test push notification
  const testNotification = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await pushNotificationService.testNotification(
        'Isha Gramotsavam Test',
        'This is a test notification to verify everything is working correctly!'
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send test notification';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Update notification settings
  const updateSettings = useCallback(async (settings: Partial<NotificationSettings>): Promise<void> => {
    try {
      setError(null);
      
      // Update local service worker settings
      await pushNotificationService.updateNotificationSettings(settings);
      
      // Update backend settings
      await updateSettingsMutation.mutateAsync(settings);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update notification settings';
      setError(errorMessage);
      throw err;
    }
  }, [updateSettingsMutation]);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    isLoading,
    error,
    
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
    updateSettings,
  };
}

export default usePushNotifications;