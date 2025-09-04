/**
 * Mobile Performance Optimization Utilities
 * Handles image lazy loading, network-aware loading, battery optimization
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  lazy?: boolean;
}

export interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export class MobileOptimization {
  private intersectionObserver?: IntersectionObserver;
  private imageCache = new Map<string, HTMLImageElement>();

  /**
   * Get network information
   */
  getNetworkInfo(): NetworkInfo | null {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (!connection) return null;

    return {
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 100,
      saveData: connection.saveData || false
    };
  }

  /**
   * Check if device is on slow network
   */
  isSlowNetwork(): boolean {
    const networkInfo = this.getNetworkInfo();
    if (!networkInfo) return false;

    return (
      networkInfo.saveData ||
      networkInfo.effectiveType === '2g' ||
      networkInfo.effectiveType === 'slow-2g' ||
      networkInfo.downlink < 1.5
    );
  }

  /**
   * Check battery status
   */
  async getBatteryInfo(): Promise<{ level: number; charging: boolean } | null> {
    try {
      const battery = await (navigator as any).getBattery?.();
      if (!battery) return null;

      return {
        level: battery.level,
        charging: battery.charging
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if device is in power saving mode
   */
  async isLowPowerMode(): Promise<boolean> {
    const battery = await this.getBatteryInfo();
    if (!battery) return false;

    return battery.level < 0.2 && !battery.charging;
  }

  /**
   * Optimize image URL based on network and device conditions
   */
  optimizeImageUrl(originalUrl: string, options: ImageOptimizationOptions = {}): string {
    const isSlowNetwork = this.isSlowNetwork();
    const baseUrl = originalUrl.split('?')[0];
    const params = new URLSearchParams();

    // Adjust quality based on network
    const quality = options.quality || (isSlowNetwork ? 60 : 80);
    params.set('q', quality.toString());

    // Adjust dimensions for mobile
    if (options.width) {
      params.set('w', Math.min(options.width, isSlowNetwork ? 400 : 800).toString());
    }
    if (options.height) {
      params.set('h', Math.min(options.height, isSlowNetwork ? 400 : 800).toString());
    }

    // Use WebP if supported and not slow network
    if (options.format === 'webp' && this.supportsWebP() && !isSlowNetwork) {
      params.set('f', 'webp');
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Check WebP support
   */
  supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Lazy load images with intersection observer
   */
  lazyLoadImage(img: HTMLImageElement, src: string, options: ImageOptimizationOptions = {}): void {
    if (!this.intersectionObserver) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const image = entry.target as HTMLImageElement;
              const dataSrc = image.dataset.src;
              
              if (dataSrc) {
                this.loadImage(image, dataSrc);
                this.intersectionObserver?.unobserve(image);
              }
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.1
        }
      );
    }

    const optimizedSrc = this.optimizeImageUrl(src, options);
    img.dataset.src = optimizedSrc;
    img.classList.add('lazy-loading');
    this.intersectionObserver.observe(img);
  }

  /**
   * Load image with caching
   */
  private async loadImage(img: HTMLImageElement, src: string): Promise<void> {
    try {
      // Check cache first
      if (this.imageCache.has(src)) {
        const cachedImg = this.imageCache.get(src)!;
        img.src = cachedImg.src;
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
        return;
      }

      // Create new image for loading
      const newImg = new Image();
      
      await new Promise<void>((resolve, reject) => {
        newImg.onload = () => {
          this.imageCache.set(src, newImg);
          img.src = newImg.src;
          img.classList.remove('lazy-loading');
          img.classList.add('lazy-loaded');
          resolve();
        };
        
        newImg.onerror = () => {
          img.classList.remove('lazy-loading');
          img.classList.add('lazy-error');
          reject(new Error('Failed to load image'));
        };
        
        newImg.src = src;
      });
    } catch (error) {
      console.error('Error loading image:', error);
    }
  }

  /**
   * Preload critical images
   */
  preloadImages(urls: string[], options: ImageOptimizationOptions = {}): Promise<void[]> {
    const isLowPower = this.isLowPowerMode();
    const isSlowNet = this.isSlowNetwork();

    // Skip preloading on slow network or low power
    if (isLowPower || isSlowNet) {
      return Promise.resolve([]);
    }

    const promises = urls.map(url => {
      const optimizedUrl = this.optimizeImageUrl(url, options);
      return this.loadImage(new Image(), optimizedUrl);
    });

    return Promise.all(promises);
  }

  /**
   * Debounce function for performance
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Throttle function for performance
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Handle touch gestures efficiently
   */
  addTouchGesture(
    element: HTMLElement,
    onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void,
    threshold: number = 50
  ): () => void {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;

      // Ignore if too slow (> 300ms) or too short
      if (deltaTime > 300 || (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold)) {
        return;
      }

      // Determine direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        onSwipe(deltaX > 0 ? 'right' : 'left');
      } else {
        onSwipe(deltaY > 0 ? 'down' : 'up');
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Return cleanup function
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.intersectionObserver?.disconnect();
    this.imageCache.clear();
  }
}

// Global instance
export const mobileOptimization = new MobileOptimization();
