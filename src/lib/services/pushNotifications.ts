/**
 * Push Notification Service
 * Handles push notification subscriptions and browser integration
 */

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  matchUpdates: boolean;
  teamUpdates: boolean;
  verificationUpdates: boolean;
  systemAnnouncements: boolean;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;

  private constructor() {
    this.checkSupport();
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Check if push notifications are supported
   */
  private checkSupport(): void {
    this.isSupported = (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Check if push notifications are supported in this browser
   */
  public isPushSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Check current notification permission status
   */
  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported) return 'denied';
    return Notification.permission;
  }

  /**
   * Request notification permission from user
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported in this browser');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notifications are blocked. Please enable them in browser settings.');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Initialize service worker for push notifications
   */
  public async initializeServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!this.isSupported) {
      throw new Error('Service Workers are not supported');
    }

    try {
      // Register the service worker if not already registered
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      await navigator.serviceWorker.ready;
      console.log('Service Worker registered successfully');

      return this.serviceWorkerRegistration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  public async subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionData> {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    // Ensure we have permission
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    // Initialize service worker if not done
    if (!this.serviceWorkerRegistration) {
      await this.initializeServiceWorker();
    }

    try {
      // Check if already subscribed
      const existingSubscription = await this.serviceWorkerRegistration!.pushManager.getSubscription();
      if (existingSubscription) {
        return this.formatSubscription(existingSubscription);
      }

      // Create new subscription
      const subscription = await this.serviceWorkerRegistration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlB64ToUint8Array(vapidPublicKey),
      });

      console.log('Push subscription created:', subscription);
      return this.formatSubscription(subscription);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Get current push subscription
   */
  public async getCurrentSubscription(): Promise<PushSubscriptionData | null> {
    if (!this.serviceWorkerRegistration) {
      await this.initializeServiceWorker();
    }

    try {
      const subscription = await this.serviceWorkerRegistration!.pushManager.getSubscription();
      return subscription ? this.formatSubscription(subscription) : null;
    } catch (error) {
      console.error('Failed to get current subscription:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.serviceWorkerRegistration) {
      return true; // Already unsubscribed
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        const result = await subscription.unsubscribe();
        console.log('Unsubscribed from push notifications:', result);
        return result;
      }
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  /**
   * Update notification settings
   */
  public async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      await this.initializeServiceWorker();
    }

    try {
      // Send settings to service worker
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve();
          } else {
            reject(new Error(event.data.error));
          }
        };

        this.serviceWorkerRegistration!.active?.postMessage({
          type: 'UPDATE_NOTIFICATION_SETTINGS',
          data: settings,
        }, [messageChannel.port2]);
      });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  }

  /**
   * Test push notification functionality
   */
  public async testNotification(title: string = 'Test Notification', message: string = 'This is a test notification from Isha Gramotsavam'): Promise<void> {
    if (!this.isSupported) {
      throw new Error('Notifications are not supported');
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    // Show a test notification
    if (this.serviceWorkerRegistration) {
      await this.serviceWorkerRegistration.showNotification(title, {
        body: message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'test-notification',
        data: {
          type: 'test',
          timestamp: Date.now(),
        },
        actions: [
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/icon-192x192.png'
          }
        ]
      });
    } else {
      // Fallback to browser notification
      new Notification(title, {
        body: message,
        icon: '/icons/icon-192x192.png',
        tag: 'test-notification',
      });
    }
  }

  /**
   * Format push subscription for API
   */
  private formatSubscription(subscription: PushSubscription): PushSubscriptionData {
    const keys = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    if (!keys || !auth) {
      throw new Error('Failed to get subscription keys');
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(keys),
        auth: this.arrayBufferToBase64(auth),
      },
    };
  }

  /**
   * Convert VAPID key from URL-safe base64 to Uint8Array
   */
  private urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return window.btoa(binary);
  }

  /**
   * Register for background sync (for offline notification actions)
   */
  public async registerBackgroundSync(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      await this.initializeServiceWorker();
    }

    if ('sync' in this.serviceWorkerRegistration!) {
      try {
        await this.serviceWorkerRegistration!.sync.register('notification-actions');
        console.log('Background sync registered for notification actions');
      } catch (error) {
        console.error('Failed to register background sync:', error);
      }
    }
  }

  /**
   * Handle incoming messages from service worker
   */
  public setupMessageListener(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data || {};

        switch (type) {
          case 'NAVIGATE_TO':
            // Handle navigation requests from notifications
            if (data.url && typeof window !== 'undefined') {
              window.location.href = data.url;
            }
            break;

          case 'NOTIFICATION_CLICKED':
            // Handle notification click analytics
            console.log('Notification clicked:', data);
            break;

          case 'SYNC_COMPLETE':
            // Handle background sync completion
            console.log('Background sync completed:', data);
            break;

          default:
            console.log('Unknown service worker message:', type, data);
        }
      });
    }
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();

// Export types
export type { PushSubscriptionData, NotificationSettings };