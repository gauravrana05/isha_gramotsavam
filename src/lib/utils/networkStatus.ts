/**
 * Enhanced network status detection with connection quality assessment
 * Provides real-time network monitoring and connection quality metrics
 */

import React from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number; // Mbps
  rtt?: number; // ms
  saveData?: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  timestamp: number;
}

export interface NetworkChangeEvent {
  status: NetworkStatus;
  previousStatus: NetworkStatus;
  changeType: 'online' | 'offline' | 'quality-change';
}

export type NetworkStatusCallback = (event: NetworkChangeEvent) => void;

class NetworkStatusService {
  private currentStatus: NetworkStatus;
  private previousStatus: NetworkStatus | null = null;
  private callbacks: Set<NetworkStatusCallback> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTestUrls: string[] = [
    '/api/health',
    'https://www.google.com/favicon.ico',
    'https://www.cloudflare.com/favicon.ico'
  ];
  private isMonitoring = false;

  constructor() {
    this.currentStatus = this.getInitialStatus();
    this.setupEventListeners();
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Start monitoring network status
   */
  startMonitoring(options: {
    heartbeatInterval?: number;
    testUrls?: string[];
  } = {}): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    if (options.testUrls) {
      this.connectionTestUrls = [...options.testUrls, ...this.connectionTestUrls];
    }

    // Start periodic connection quality checks
    const interval = options.heartbeatInterval || 30000; // 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.performConnectionTest();
    }, interval);

    // Initial connection test
    this.performConnectionTest();
  }

  /**
   * Stop monitoring network status
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(callback: NetworkStatusCallback): () => void {
    this.callbacks.add(callback);
    
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Test connection quality manually
   */
  async testConnectionQuality(): Promise<NetworkStatus> {
    await this.performConnectionTest();
    return this.getStatus();
  }

  /**
   * Check if device is currently online
   */
  isOnline(): boolean {
    return this.currentStatus.isOnline;
  }

  /**
   * Check if connection quality is sufficient for operation
   */
  isConnectionSufficient(minQuality: 'poor' | 'fair' | 'good' | 'excellent' = 'fair'): boolean {
    const qualityLevels = ['poor', 'fair', 'good', 'excellent'];
    const currentLevel = qualityLevels.indexOf(this.currentStatus.connectionQuality);
    const minLevel = qualityLevels.indexOf(minQuality);
    
    return this.currentStatus.isOnline && currentLevel >= minLevel;
  }

  /**
   * Wait for network to be available
   */
  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isOnline()) {
        resolve(true);
        return;
      }

      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.subscribe((event) => {
        if (event.changeType === 'online') {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  /**
   * Estimate data transfer time based on connection quality
   */
  estimateTransferTime(dataSize: number): number {
    if (!this.currentStatus.isOnline) return Infinity;

    const downlink = this.currentStatus.downlink || this.getEstimatedDownlink();
    const sizeInMb = dataSize / (1024 * 1024);
    const transferTimeSeconds = sizeInMb / downlink;
    
    // Add RTT overhead
    const rtt = this.currentStatus.rtt || this.getEstimatedRTT();
    return (transferTimeSeconds * 1000) + rtt;
  }

  // Private methods

  private getInitialStatus(): NetworkStatus {
    const navigator = globalThis.navigator;
    const connection = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
    
    return {
      isOnline: navigator?.onLine ?? true,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      connectionQuality: this.determineConnectionQuality({
        isOnline: navigator?.onLine ?? true,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt
      }),
      timestamp: Date.now()
    };
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Listen for connection changes (if supported)
    const navigator = globalThis.navigator;
    const connection = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange.bind(this));
    }

    // Listen for visibility changes to test connection when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isMonitoring) {
        setTimeout(() => this.performConnectionTest(), 1000);
      }
    });
  }

  private handleOnline(): void {
    this.updateStatus({
      isOnline: true,
      timestamp: Date.now()
    });
    
    // Perform connection test to get accurate quality info
    if (this.isMonitoring) {
      setTimeout(() => this.performConnectionTest(), 100);
    }
  }

  private handleOffline(): void {
    this.updateStatus({
      isOnline: false,
      connectionQuality: 'offline',
      timestamp: Date.now()
    });
  }

  private handleConnectionChange(): void {
    const navigator = globalThis.navigator;
    const connection = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
    
    if (connection) {
      this.updateStatus({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
        connectionQuality: this.determineConnectionQuality({
          isOnline: this.currentStatus.isOnline,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        }),
        timestamp: Date.now()
      });
    }
  }

  private async performConnectionTest(): Promise<void> {
    if (!navigator.onLine) {
      this.updateStatus({
        isOnline: false,
        connectionQuality: 'offline',
        timestamp: Date.now()
      });
      return;
    }

    try {
      const results = await this.testMultipleEndpoints();
      const avgRtt = results.length > 0 ? 
        results.reduce((sum, r) => sum + r.rtt, 0) / results.length : 
        undefined;

      const successRate = results.length > 0 ? 
        results.filter(r => r.success).length / results.length : 
        0;

      // Update status based on test results
      const isOnline = successRate > 0;
      const connectionQuality = this.determineConnectionQuality({
        isOnline,
        rtt: avgRtt,
        successRate
      });

      this.updateStatus({
        isOnline,
        rtt: avgRtt,
        connectionQuality,
        timestamp: Date.now()
      });

    } catch (error) {
      console.warn('Connection test failed:', error);
      
      // If test fails but navigator.onLine is true, assume poor connection
      this.updateStatus({
        isOnline: true,
        connectionQuality: 'poor',
        timestamp: Date.now()
      });
    }
  }

  private async testMultipleEndpoints(): Promise<Array<{ success: boolean; rtt: number; url: string }>> {
    const tests = this.connectionTestUrls.slice(0, 3).map(url => this.testEndpoint(url));
    const results = await Promise.allSettled(tests);
    
    return results
      .filter((result): result is PromiseFulfilledResult<{ success: boolean; rtt: number; url: string }> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  private async testEndpoint(url: string): Promise<{ success: boolean; rtt: number; url: string }> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
        mode: 'no-cors' // Allow cross-origin requests
      });
      
      clearTimeout(timeoutId);
      const rtt = Date.now() - startTime;
      
      return {
        success: true,
        rtt,
        url
      };
    } catch (error) {
      const rtt = Date.now() - startTime;
      return {
        success: false,
        rtt,
        url
      };
    }
  }

  private determineConnectionQuality(params: {
    isOnline: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    successRate?: number;
  }): NetworkStatus['connectionQuality'] {
    if (!params.isOnline) return 'offline';

    // Use success rate if available (from connection tests)
    if (params.successRate !== undefined) {
      if (params.successRate === 0) return 'offline';
      if (params.successRate < 0.5) return 'poor';
    }

    // Use RTT if available
    if (params.rtt !== undefined) {
      if (params.rtt > 2000) return 'poor';
      if (params.rtt > 1000) return 'fair';
      if (params.rtt > 500) return 'good';
      if (params.rtt <= 500) return 'excellent';
    }

    // Use effective type if available
    if (params.effectiveType) {
      switch (params.effectiveType) {
        case 'slow-2g': return 'poor';
        case '2g': return 'poor';
        case '3g': return 'fair';
        case '4g': return 'good';
        default: return 'good';
      }
    }

    // Use downlink if available
    if (params.downlink !== undefined) {
      if (params.downlink < 0.5) return 'poor';
      if (params.downlink < 2) return 'fair';
      if (params.downlink < 10) return 'good';
      return 'excellent';
    }

    // Default to good if online but no specific metrics
    return 'good';
  }

  private getEstimatedDownlink(): number {
    switch (this.currentStatus.effectiveType) {
      case 'slow-2g': return 0.1;
      case '2g': return 0.3;
      case '3g': return 2;
      case '4g': return 10;
      default: return 5; // Default assumption
    }
  }

  private getEstimatedRTT(): number {
    switch (this.currentStatus.connectionQuality) {
      case 'poor': return 1500;
      case 'fair': return 800;
      case 'good': return 300;
      case 'excellent': return 100;
      default: return 500;
    }
  }

  private updateStatus(updates: Partial<NetworkStatus>): void {
    this.previousStatus = { ...this.currentStatus };
    this.currentStatus = { ...this.currentStatus, ...updates };

    // Determine change type
    let changeType: NetworkChangeEvent['changeType'] = 'quality-change';
    
    if (this.previousStatus.isOnline !== this.currentStatus.isOnline) {
      changeType = this.currentStatus.isOnline ? 'online' : 'offline';
    }

    // Notify callbacks
    const event: NetworkChangeEvent = {
      status: { ...this.currentStatus },
      previousStatus: { ...this.previousStatus },
      changeType
    };

    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Network status callback error:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.callbacks.clear();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
  }
}

// Singleton instance
let networkStatusInstance: NetworkStatusService | null = null;

/**
 * Get the singleton NetworkStatusService instance
 */
export const getNetworkStatus = (): NetworkStatusService => {
  if (!networkStatusInstance) {
    networkStatusInstance = new NetworkStatusService();
  }
  return networkStatusInstance;
};

// Hook for React components
export const useNetworkStatus = () => {
  if (typeof window === 'undefined') {
    return {
      isOnline: false,
      connectionQuality: 'offline' as const,
      isConnectionSufficient: () => false,
      waitForConnection: async () => false,
      estimateTransferTime: () => Infinity
    };
  }

  const networkService = getNetworkStatus();
  const [status, setStatus] = React.useState(networkService.getStatus());

  React.useEffect(() => {
    const unsubscribe = networkService.subscribe((event) => {
      setStatus(event.status);
    });

    // Start monitoring when hook is used
    networkService.startMonitoring();

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isOnline: status.isOnline,
    connectionQuality: status.connectionQuality,
    effectiveType: status.effectiveType,
    downlink: status.downlink,
    rtt: status.rtt,
    isConnectionSufficient: (minQuality?: 'poor' | 'fair' | 'good' | 'excellent') => 
      networkService.isConnectionSufficient(minQuality),
    waitForConnection: (timeout?: number) => networkService.waitForConnection(timeout),
    estimateTransferTime: (dataSize: number) => networkService.estimateTransferTime(dataSize)
  };
};

export { NetworkStatusService };