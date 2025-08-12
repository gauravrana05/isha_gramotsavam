/**
 * Background sync client integration
 * Connects the offline-first architecture with service worker background sync
 */
import React from 'react';

export interface BackgroundSyncResult {
  success: boolean;
  error?: string;
  synced?: number;
  failed?: number;
}

export interface SyncConfiguration {
  enabled: boolean;
  immediate: boolean;
  retryDelay: number;
  maxRetries: number;
  networkConditions: {
    minConnectionQuality: 'poor' | 'fair' | 'good' | 'excellent';
    requiresUnmeteredConnection: boolean;
  };
}

class BackgroundSyncService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSupported = false;
  private config: SyncConfiguration = {
    enabled: true,
    immediate: true,
    retryDelay: 60000,
    maxRetries: 3,
    networkConditions: {
      minConnectionQuality: 'poor',
      requiresUnmeteredConnection: false
    }
  };

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize background sync service
   */
  private async initializeService(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Check for service worker and background sync support
      this.isSupported = (
        'serviceWorker' in navigator &&
        'sync' in window.ServiceWorkerRegistration.prototype
      );

      if (this.isSupported) {
        this.swRegistration = await navigator.serviceWorker.ready;
        this.setupMessageHandler();
        console.log('Background sync service initialized');
      } else {
        console.warn('Background sync not supported in this browser');
      }
    } catch (error) {
      console.error('Failed to initialize background sync service:', error);
    }
  }

  /**
   * Configure background sync settings
   */
  configure(config: Partial<SyncConfiguration>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if background sync is supported
   */
  isBackgroundSyncSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Register a background sync event
   */
  async registerSync(tag: string = 'isha-gramotsavam-sync'): Promise<boolean> {
    if (!this.isSupported || !this.swRegistration) {
      console.warn('Background sync not available');
      return false;
    }

    try {
      // Type assertion for background sync support
      const registration = this.swRegistration as any;
      await registration.sync.register(tag);
      console.log(`Background sync registered: ${tag}`);
      return true;
    } catch (error) {
      console.error('Failed to register background sync:', error);
      return false;
    }
  }

  /**
   * Trigger manual sync
   */
  async triggerManualSync(): Promise<BackgroundSyncResult> {
    if (!this.isSupported || !this.swRegistration) {
      return {
        success: false,
        error: 'Background sync not supported'
      };
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      // Send message to service worker
      this.swRegistration!.active?.postMessage(
        { type: 'TRIGGER_SYNC' },
        [channel.port2]
      );

      // Timeout after 30 seconds
      setTimeout(() => {
        resolve({
          success: false,
          error: 'Sync request timed out'
        });
      }, 30000);
    });
  }

  /**
   * Schedule periodic sync based on network conditions
   */
  async schedulePeriodicSync(intervalMs: number = 300000): Promise<boolean> {
    if (!this.isSupported) return false;

    // Register for background sync periodically
    const scheduleSync = async () => {
      if (navigator.onLine) {
        await this.registerSync();
      }
    };

    // Schedule immediate sync
    await scheduleSync();

    // Set up periodic scheduling
    setInterval(scheduleSync, intervalMs);
    
    return true;
  }

  /**
   * Setup message handler for service worker communication
   */
  private setupMessageHandler(): void {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_STATUS_UPDATE') {
        this.handleSyncStatusUpdate(event.data);
      }
    });
  }

  /**
   * Handle sync status updates from service worker
   */
  private handleSyncStatusUpdate(data: any): void {
    console.log('Sync status update:', data);
    
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('background-sync-update', {
      detail: data
    }));
  }

  /**
   * Request persistent storage for PWA
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) {
      return false;
    }

    try {
      const persistent = await navigator.storage.persist();
      console.log(`Persistent storage: ${persistent}`);
      return persistent;
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      return false;
    }
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<{
    quota: number;
    usage: number;
    usagePercentage: number;
  }> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      return { quota: 0, usage: 0, usagePercentage: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const usagePercentage = quota > 0 ? (usage / quota) * 100 : 0;

      return { quota, usage, usagePercentage };
    } catch (error) {
      console.error('Failed to get storage quota:', error);
      return { quota: 0, usage: 0, usagePercentage: 0 };
    }
  }

  /**
   * Monitor network conditions for optimal sync timing
   */
  startNetworkMonitoring(): void {
    if (!('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    
    const updateConnectionInfo = () => {
      const shouldSync = this.shouldSyncBasedOnConnection(connection);
      
      if (shouldSync && navigator.onLine) {
        this.registerSync();
      }
    };

    connection.addEventListener('change', updateConnectionInfo);
    updateConnectionInfo(); // Initial check
  }

  /**
   * Determine if sync should happen based on connection quality
   */
  private shouldSyncBasedOnConnection(connection: any): boolean {
    if (!connection) return true;

    const effectiveType = connection.effectiveType;
    const saveData = connection.saveData;

    // Don't sync on save-data mode unless critical
    if (saveData && !this.config.immediate) return false;

    // Check minimum connection quality
    const qualityMap: Record<string, number> = {
      'slow-2g': 1,
      '2g': 2,
      '3g': 3,
      '4g': 4,
      'poor': 1,
      'fair': 2,
      'good': 3,
      'excellent': 4
    };

    const requiredQuality = qualityMap[this.config.networkConditions.minConnectionQuality] || 1;
    const currentQuality = qualityMap[effectiveType] || 4;

    return currentQuality >= requiredQuality;
  }

  /**
   * Setup push notifications for sync status
   */
  async setupPushNotifications(): Promise<boolean> {
    if (!('Notification' in window) || !this.swRegistration) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Push notifications enabled for sync status');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to setup push notifications:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Cleanup any intervals, listeners, etc.
    console.log('Background sync service destroyed');
  }
}

// Create singleton instance
let backgroundSyncInstance: BackgroundSyncService | null = null;

/**
 * Get the singleton BackgroundSyncService instance
 */
export const getBackgroundSync = (): BackgroundSyncService => {
  if (!backgroundSyncInstance) {
    backgroundSyncInstance = new BackgroundSyncService();
  }
  return backgroundSyncInstance;
};

/**
 * React hook for background sync integration
 */
export const useBackgroundSync = () => {
  const [syncStatus, setSyncStatus] = React.useState<{
    isSupported: boolean;
    isActive: boolean;
    lastSync: number | null;
  }>({
    isSupported: false,
    isActive: false,
    lastSync: null
  });

  React.useEffect(() => {
    const syncService = getBackgroundSync();
    
    setSyncStatus(prev => ({
      ...prev,
      isSupported: syncService.isBackgroundSyncSupported()
    }));

    // Listen for sync status updates
    const handleSyncUpdate = (event: any) => {
      setSyncStatus(prev => ({
        ...prev,
        isActive: event.detail.status === 'active',
        lastSync: event.detail.timestamp || prev.lastSync
      }));
    };

    window.addEventListener('background-sync-update', handleSyncUpdate);

    // Setup periodic sync and notifications
    if (syncService.isBackgroundSyncSupported()) {
      syncService.schedulePeriodicSync();
      syncService.setupPushNotifications();
      syncService.startNetworkMonitoring();
      syncService.requestPersistentStorage();
    }

    return () => {
      window.removeEventListener('background-sync-update', handleSyncUpdate);
    };
  }, []);

  const triggerSync = React.useCallback(async () => {
    const syncService = getBackgroundSync();
    return await syncService.triggerManualSync();
  }, []);

  const getStorageInfo = React.useCallback(async () => {
    const syncService = getBackgroundSync();
    return await syncService.getStorageQuota();
  }, []);

  return {
    ...syncStatus,
    triggerSync,
    getStorageInfo
  };
};

export { BackgroundSyncService };