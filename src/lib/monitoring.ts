// Production error monitoring and logging

interface ErrorLog {
  message: string;
  stack?: string;
  userId?: string;
  url: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorMonitor {
  private static instance: ErrorMonitor;
  private errors: ErrorLog[] = [];

  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  logError(error: Error, context?: { userId?: string; severity?: ErrorLog['severity'] }) {
    const errorLog: ErrorLog = {
      message: error.message,
      stack: error.stack,
      userId: context?.userId,
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      timestamp: new Date(),
      severity: context?.severity || 'medium'
    };

    this.errors.push(errorLog);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error logged:', errorLog);
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorLog);
    }
  }

  private async sendToMonitoring(errorLog: ErrorLog) {
    try {
      // Send to Vercel Analytics or external service
      await fetch('/api/monitoring/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorLog)
      });
    } catch (err) {
      console.error('Failed to send error to monitoring:', err);
    }
  }

  getRecentErrors(limit = 10): ErrorLog[] {
    return this.errors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getCriticalErrors(): ErrorLog[] {
    return this.errors.filter(e => e.severity === 'critical');
  }
}

// Global error handler
export function setupErrorMonitoring() {
  const monitor = ErrorMonitor.getInstance();

  // Catch unhandled errors
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      monitor.logError(new Error(event.message), { severity: 'high' });
    });

    window.addEventListener('unhandledrejection', (event) => {
      monitor.logError(new Error(event.reason), { severity: 'critical' });
    });
  }
}

// Export singleton instance
export const errorMonitor = ErrorMonitor.getInstance();

// Helper function for API routes
export function logApiError(error: Error, userId?: string) {
  errorMonitor.logError(error, { userId, severity: 'high' });
}
