/**
 * Mobile Analytics Service
 * Tracks mobile usage patterns, performance metrics, and user engagement
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

export interface NetworkTransition {
  from: 'online' | 'offline';
  to: 'online' | 'offline';
  timestamp: number;
  duration?: number;
}

export interface UserEngagement {
  sessionStart: number;
  sessionEnd?: number;
  pageViews: number;
  interactions: number;
  timeOnPage: Record<string, number>;
  bounceRate: number;
}

export class MobileAnalytics {
  private sessionId: string;
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private performanceObserver?: PerformanceObserver;
  private networkTransitions: NetworkTransition[] = [];
  private engagement: UserEngagement;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.engagement = {
      sessionStart: Date.now(),
      pageViews: 0,
      interactions: 0,
      timeOnPage: {},
      bounceRate: 0
    };

    this.initializeTracking();
  }

  /**
   * Initialize tracking systems
   */
  private initializeTracking(): void {
    // Track network changes
    window.addEventListener('online', this.handleNetworkChange.bind(this));
    window.addEventListener('offline', this.handleNetworkChange.bind(this));

    // Track page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Track user interactions
    this.trackUserInteractions();

    // Initialize performance tracking
    this.initializePerformanceTracking();

    // Track session end
    window.addEventListener('beforeunload', this.endSession.bind(this));
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void {
    this.userId = userId;
    this.track('user_identified', { userId });
  }

  /**
   * Track custom event
   */
  track(eventName: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        connectionType: this.getConnectionType(),
        isOnline: this.isOnline
      },
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId
    };

    this.events.push(event);
    this.sendEventToServer(event);
  }

  /**
   * Track page view
   */
  trackPageView(page: string, title?: string): void {
    this.engagement.pageViews++;
    
    // Track time on previous page
    if (this.engagement.timeOnPage[page]) {
      const timeSpent = Date.now() - this.engagement.timeOnPage[page];
      this.track('page_time_spent', { page, timeSpent });
    }

    this.engagement.timeOnPage[page] = Date.now();

    this.track('page_view', {
      page,
      title: title || document.title,
      referrer: document.referrer,
      url: window.location.href
    });
  }

  /**
   * Track mobile-specific events
   */
  trackMobileEvent(eventType: 'swipe' | 'pinch' | 'rotate' | 'install' | 'add_to_homescreen', data?: any): void {
    this.track(`mobile_${eventType}`, {
      ...data,
      isMobile: this.isMobileDevice(),
      isStandalone: this.isStandaloneApp(),
      orientation: screen.orientation?.type || 'unknown'
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: Partial<PerformanceMetrics>): void {
    this.track('performance_metrics', {
      ...metrics,
      connectionType: this.getConnectionType(),
      deviceMemory: (navigator as any).deviceMemory || 'unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
    });
  }

  /**
   * Track offline/online transitions
   */
  private handleNetworkChange(): void {
    const wasOnline = this.isOnline;
    this.isOnline = navigator.onLine;

    const transition: NetworkTransition = {
      from: wasOnline ? 'online' : 'offline',
      to: this.isOnline ? 'online' : 'offline',
      timestamp: Date.now()
    };

    // Calculate offline duration
    if (this.isOnline && this.networkTransitions.length > 0) {
      const lastTransition = this.networkTransitions[this.networkTransitions.length - 1];
      if (lastTransition.to === 'offline') {
        transition.duration = transition.timestamp - lastTransition.timestamp;
      }
    }

    this.networkTransitions.push(transition);
    this.track('network_change', transition);
  }

  /**
   * Track page visibility changes
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.track('page_hidden', { timestamp: Date.now() });
    } else {
      this.track('page_visible', { timestamp: Date.now() });
    }
  }

  /**
   * Track user interactions
   */
  private trackUserInteractions(): void {
    const interactionEvents = ['click', 'touchstart', 'keydown', 'scroll'];
    
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.engagement.interactions++;
      }, { passive: true });
    });
  }

  /**
   * Initialize performance tracking
   */
  private initializePerformanceTracking(): void {
    // Track Web Vitals
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackPerformance({
              pageLoadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
              timeToInteractive: navEntry.domInteractive - navEntry.navigationStart
            });
          }
          
          if (entry.entryType === 'paint') {
            if (entry.name === 'first-contentful-paint') {
              this.trackPerformance({
                firstContentfulPaint: entry.startTime
              });
            }
          }
          
          if (entry.entryType === 'largest-contentful-paint') {
            this.trackPerformance({
              largestContentfulPaint: entry.startTime
            });
          }
          
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            this.trackPerformance({
              cumulativeLayoutShift: (entry as any).value
            });
          }
          
          if (entry.entryType === 'first-input') {
            this.trackPerformance({
              firstInputDelay: (entry as any).processingStart - entry.startTime
            });
          }
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] 
      });
    }
  }

  /**
   * Get connection type
   */
  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  /**
   * Check if mobile device
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Check if standalone app
   */
  private isStandaloneApp(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * End session tracking
   */
  private endSession(): void {
    this.engagement.sessionEnd = Date.now();
    const sessionDuration = this.engagement.sessionEnd - this.engagement.sessionStart;
    
    this.track('session_end', {
      sessionDuration,
      pageViews: this.engagement.pageViews,
      interactions: this.engagement.interactions,
      bounceRate: this.engagement.pageViews === 1 ? 1 : 0
    });

    this.flushEvents();
  }

  /**
   * Send event to server
   */
  private async sendEventToServer(event: AnalyticsEvent): Promise<void> {
    try {
      // In a real implementation, you'd send to your analytics service
      // For now, we'll just log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Analytics Event:', event);
      }

      // Example: Send to your analytics endpoint
      // await fetch('/api/analytics/track', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  /**
   * Flush all pending events
   */
  private async flushEvents(): Promise<void> {
    if (this.events.length === 0) return;

    try {
      // Send all pending events
      await Promise.all(
        this.events.map(event => this.sendEventToServer(event))
      );
      
      this.events = [];
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
    }
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary(): {
    sessionId: string;
    userId?: string;
    engagement: UserEngagement;
    networkTransitions: NetworkTransition[];
    eventCount: number;
  } {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      engagement: this.engagement,
      networkTransitions: this.networkTransitions,
      eventCount: this.events.length
    };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.performanceObserver?.disconnect();
    window.removeEventListener('online', this.handleNetworkChange);
    window.removeEventListener('offline', this.handleNetworkChange);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.endSession);
  }
}

// Global instance
export const mobileAnalytics = new MobileAnalytics();
