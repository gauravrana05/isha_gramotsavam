/**
 * Mobile Testing Utilities
 * Tools for testing mobile functionality, offline scenarios, and performance
 */

export interface DeviceSimulation {
  name: string;
  width: number;
  height: number;
  pixelRatio: number;
  userAgent: string;
  touch: boolean;
}

export interface NetworkCondition {
  name: string;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
  packetLoss?: number;
}

export interface PerformanceTest {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metrics?: Record<string, number>;
}

export class MobileTestUtils {
  private performanceTests: Map<string, PerformanceTest> = new Map();
  private originalOnLine: boolean;
  private originalConnection: any;

  constructor() {
    this.originalOnLine = navigator.onLine;
    this.originalConnection = (navigator as any).connection;
  }

  /**
   * Common mobile device configurations
   */
  static DEVICES: Record<string, DeviceSimulation> = {
    'iPhone 12': {
      name: 'iPhone 12',
      width: 390,
      height: 844,
      pixelRatio: 3,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      touch: true
    },
    'iPhone 12 Pro Max': {
      name: 'iPhone 12 Pro Max',
      width: 428,
      height: 926,
      pixelRatio: 3,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      touch: true
    },
    'Samsung Galaxy S21': {
      name: 'Samsung Galaxy S21',
      width: 384,
      height: 854,
      pixelRatio: 2.75,
      userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36',
      touch: true
    },
    'iPad Air': {
      name: 'iPad Air',
      width: 820,
      height: 1180,
      pixelRatio: 2,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      touch: true
    }
  };

  /**
   * Network condition presets
   */
  static NETWORK_CONDITIONS: Record<string, NetworkCondition> = {
    'Fast 3G': {
      name: 'Fast 3G',
      downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
      uploadThroughput: 0.75 * 1024 * 1024 / 8,   // 750 Kbps
      latency: 150
    },
    'Slow 3G': {
      name: 'Slow 3G',
      downloadThroughput: 0.4 * 1024 * 1024 / 8,  // 400 Kbps
      uploadThroughput: 0.4 * 1024 * 1024 / 8,    // 400 Kbps
      latency: 300
    },
    '2G': {
      name: '2G',
      downloadThroughput: 0.25 * 1024 * 1024 / 8, // 250 Kbps
      uploadThroughput: 0.25 * 1024 * 1024 / 8,   // 250 Kbps
      latency: 800
    },
    'Offline': {
      name: 'Offline',
      downloadThroughput: 0,
      uploadThroughput: 0,
      latency: 0
    }
  };

  /**
   * Simulate mobile device viewport
   */
  simulateDevice(device: DeviceSimulation): void {
    // Set viewport size
    if (window.innerWidth !== device.width || window.innerHeight !== device.height) {
      console.warn('Cannot resize window in browser. Use browser dev tools to set viewport size.');
    }

    // Simulate pixel ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: device.pixelRatio
    });

    // Simulate user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: device.userAgent
    });

    // Add touch simulation class
    if (device.touch) {
      document.documentElement.classList.add('touch-device');
    }

    console.log(`Simulating device: ${device.name}`);
  }

  /**
   * Simulate network conditions
   */
  simulateNetworkCondition(condition: NetworkCondition): void {
    // Simulate connection object
    const mockConnection = {
      effectiveType: condition.name.toLowerCase().includes('2g') ? '2g' : 
                    condition.name.toLowerCase().includes('3g') ? '3g' : '4g',
      downlink: condition.downloadThroughput / (1024 * 1024 / 8), // Convert to Mbps
      rtt: condition.latency,
      saveData: condition.name === 'Slow 3G' || condition.name === '2G'
    };

    Object.defineProperty(navigator, 'connection', {
      writable: true,
      configurable: true,
      value: mockConnection
    });

    console.log(`Simulating network: ${condition.name}`);
  }

  /**
   * Simulate offline mode
   */
  simulateOffline(): void {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: false
    });

    // Dispatch offline event
    window.dispatchEvent(new Event('offline'));
    console.log('Simulating offline mode');
  }

  /**
   * Simulate online mode
   */
  simulateOnline(): void {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true
    });

    // Dispatch online event
    window.dispatchEvent(new Event('online'));
    console.log('Simulating online mode');
  }

  /**
   * Test offline functionality
   */
  async testOfflineScenario(testFn: () => Promise<void>): Promise<void> {
    console.log('Starting offline scenario test');
    
    // Go offline
    this.simulateOffline();
    
    try {
      await testFn();
      console.log('Offline scenario test completed successfully');
    } catch (error) {
      console.error('Offline scenario test failed:', error);
      throw error;
    } finally {
      // Restore online
      this.simulateOnline();
    }
  }

  /**
   * Test push notifications
   */
  async testPushNotification(notification: {
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Simulate push event
      const pushEvent = new MessageEvent('push', {
        data: JSON.stringify(notification)
      });

      // Dispatch to service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'PUSH_TEST',
          data: notification
        });
      }

      console.log('Push notification test sent:', notification.title);
    } catch (error) {
      console.error('Push notification test failed:', error);
      throw error;
    }
  }

  /**
   * Start performance test
   */
  startPerformanceTest(testName: string): void {
    const test: PerformanceTest = {
      name: testName,
      startTime: performance.now()
    };

    this.performanceTests.set(testName, test);
    console.log(`Performance test started: ${testName}`);
  }

  /**
   * End performance test
   */
  endPerformanceTest(testName: string): PerformanceTest | null {
    const test = this.performanceTests.get(testName);
    if (!test) {
      console.warn(`Performance test not found: ${testName}`);
      return null;
    }

    test.endTime = performance.now();
    test.duration = test.endTime - test.startTime;

    console.log(`Performance test completed: ${testName} (${test.duration.toFixed(2)}ms)`);
    return test;
  }

  /**
   * Measure page load performance
   */
  measurePageLoadPerformance(): Record<string, number> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (!navigation) {
      console.warn('Navigation timing not available');
      return {};
    }

    const metrics = {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstByte: navigation.responseStart - navigation.requestStart,
      domInteractive: navigation.domInteractive - navigation.navigationStart,
      domComplete: navigation.domComplete - navigation.navigationStart
    };

    console.log('Page load performance:', metrics);
    return metrics;
  }

  /**
   * Test touch gestures
   */
  simulateTouchGesture(
    element: HTMLElement,
    gesture: 'tap' | 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'pinch'
  ): void {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    switch (gesture) {
      case 'tap':
        this.simulateTap(element, centerX, centerY);
        break;
      case 'swipe-left':
        this.simulateSwipe(element, centerX, centerY, centerX - 100, centerY);
        break;
      case 'swipe-right':
        this.simulateSwipe(element, centerX, centerY, centerX + 100, centerY);
        break;
      case 'swipe-up':
        this.simulateSwipe(element, centerX, centerY, centerX, centerY - 100);
        break;
      case 'swipe-down':
        this.simulateSwipe(element, centerX, centerY, centerX, centerY + 100);
        break;
      case 'pinch':
        this.simulatePinch(element, centerX, centerY);
        break;
    }
  }

  /**
   * Simulate tap gesture
   */
  private simulateTap(element: HTMLElement, x: number, y: number): void {
    const touchStart = new TouchEvent('touchstart', {
      touches: [new Touch({
        identifier: 0,
        target: element,
        clientX: x,
        clientY: y
      })]
    });

    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [new Touch({
        identifier: 0,
        target: element,
        clientX: x,
        clientY: y
      })]
    });

    element.dispatchEvent(touchStart);
    setTimeout(() => element.dispatchEvent(touchEnd), 100);
  }

  /**
   * Simulate swipe gesture
   */
  private simulateSwipe(
    element: HTMLElement,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): void {
    const touchStart = new TouchEvent('touchstart', {
      touches: [new Touch({
        identifier: 0,
        target: element,
        clientX: startX,
        clientY: startY
      })]
    });

    const touchMove = new TouchEvent('touchmove', {
      touches: [new Touch({
        identifier: 0,
        target: element,
        clientX: endX,
        clientY: endY
      })]
    });

    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [new Touch({
        identifier: 0,
        target: element,
        clientX: endX,
        clientY: endY
      })]
    });

    element.dispatchEvent(touchStart);
    setTimeout(() => element.dispatchEvent(touchMove), 50);
    setTimeout(() => element.dispatchEvent(touchEnd), 150);
  }

  /**
   * Simulate pinch gesture
   */
  private simulatePinch(element: HTMLElement, centerX: number, centerY: number): void {
    const touch1Start = new Touch({
      identifier: 0,
      target: element,
      clientX: centerX - 50,
      clientY: centerY
    });

    const touch2Start = new Touch({
      identifier: 1,
      target: element,
      clientX: centerX + 50,
      clientY: centerY
    });

    const touchStart = new TouchEvent('touchstart', {
      touches: [touch1Start, touch2Start]
    });

    element.dispatchEvent(touchStart);
    console.log('Pinch gesture simulated');
  }

  /**
   * Reset all simulations
   */
  resetSimulations(): void {
    // Restore original values
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: this.originalOnLine
    });

    Object.defineProperty(navigator, 'connection', {
      writable: true,
      configurable: true,
      value: this.originalConnection
    });

    // Remove touch class
    document.documentElement.classList.remove('touch-device');

    console.log('All simulations reset');
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): Record<string, PerformanceTest> {
    const summary: Record<string, PerformanceTest> = {};
    
    this.performanceTests.forEach((test, name) => {
      summary[name] = { ...test };
    });

    return summary;
  }
}

// Global instance
export const mobileTestUtils = new MobileTestUtils();
