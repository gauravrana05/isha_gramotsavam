/**
 * Push Notification Service
 * Handles PWA push notifications for mobile captain/player interfaces
 */

export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

export class PushNotificationService {
  private vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(userId: string): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported');
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Save subscription to server
      await this.saveSubscription(subscription, userId);
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Save push subscription to server
   */
  async saveSubscription(subscription: PushSubscription, userId: string): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: this.arrayBufferToBase64(subscription.getKey('auth'))
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const result = await subscription.unsubscribe();
        // TODO: Remove subscription from server
        return result;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Show local notification (fallback)
   */
  async showLocalNotification(data: PushNotificationData): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/android/android-launchericon-192-192.png',
      badge: data.badge || '/icons/android/android-launchericon-96-96.png',
      image: data.image,
      data: data.data,
      actions: data.actions,
      tag: data.tag,
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    });
  }

  /**
   * Handle notification click
   */
  handleNotificationClick(event: NotificationEvent): void {
    event.notification.close();

    const data = event.notification.data;
    const action = event.action;

    // Handle different notification actions
    if (action === 'view') {
      // Open the app to specific page
      event.waitUntil(
        self.clients.openWindow(data.url || '/en/dashboard')
      );
    } else if (action === 'dismiss') {
      // Just close the notification
      return;
    } else {
      // Default action - open app
      event.waitUntil(
        self.clients.openWindow(data.url || '/en/dashboard')
      );
    }
  }

  /**
   * Utility: Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
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
   * Utility: Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return '';
    
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
