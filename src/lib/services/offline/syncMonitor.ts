/**
 * Sync Statistics and Monitoring System
 * Comprehensive monitoring of background sync performance and health
 * Provides real-time metrics, performance analytics, and sync optimization insights
 */

import { getVolunteerStorage } from './volunteerStorage';
import { SyncAction, SyncStats } from './backgroundSync';
import { ConflictStats } from './conflictResolver';
import { UploadStats } from './mediaQueue';

export interface SyncMetrics {
  // Performance metrics
  avgSyncTime: number; // milliseconds
  successRate: number; // percentage
  throughput: number; // actions per minute
  
  // Queue metrics  
  queueDepth: number; // current pending actions
  maxQueueDepth: number; // max queue depth in last 24h
  avgQueueWaitTime: number; // milliseconds
  
  // Network metrics
  networkRequests: number;
  networkErrors: number;
  avgLatency: number; // milliseconds
  dataTransferred: number; // bytes
  
  // Error metrics
  timeoutErrors: number;
  conflictErrors: number;
  authErrors: number;
  networkErrors: number;
  otherErrors: number;
}

export interface SyncHealth {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  score: number; // 0-100
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'performance' | 'reliability' | 'capacity' | 'network';
    description: string;
    recommendation: string;
  }>;
  
  // Health indicators
  indicators: {
    syncSuccess: number; // 0-100
    responseTime: number; // 0-100  
    queueHealth: number; // 0-100
    errorRate: number; // 0-100
    networkStability: number; // 0-100
  };
}

export interface SyncInsights {
  // Optimization suggestions
  recommendations: Array<{
    type: 'performance' | 'reliability' | 'capacity' | 'user_experience';
    priority: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }>;
  
  // Trends analysis
  trends: {
    syncVolume: 'increasing' | 'stable' | 'decreasing';
    errorRate: 'improving' | 'stable' | 'degrading';
    performance: 'improving' | 'stable' | 'degrading';
    queueSize: 'growing' | 'stable' | 'shrinking';
  };
  
  // Usage patterns
  patterns: {
    peakHours: number[]; // Hours with highest sync activity
    busyDays: string[]; // Days with highest activity
    commonErrors: Array<{ error: string; count: number; percentage: number }>;
    slowestOperations: Array<{ operation: string; avgTime: number; count: number }>;
  };
}

export interface SyncEvent {
  id: string;
  type: 'sync_start' | 'sync_complete' | 'sync_error' | 'queue_full' | 'network_change' | 'conflict_detected';
  timestamp: number;
  actionId?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export class SyncMonitor {
  private storage: Awaited<ReturnType<typeof getVolunteerStorage>> | null = null;
  private events: SyncEvent[] = [];
  private metrics: Map<string, number[]> = new Map(); // Time series data
  private readonly MAX_EVENTS = 1000;
  private readonly METRICS_RETENTION = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Real-time monitoring state
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  // Callbacks
  private onHealthChange?: (health: SyncHealth) => void;
  private onMetricsUpdate?: (metrics: SyncMetrics) => void;
  private onCriticalIssue?: (issue: SyncHealth['issues'][0]) => void;

  constructor(
    onHealthChange?: (health: SyncHealth) => void,
    onMetricsUpdate?: (metrics: SyncMetrics) => void,
    onCriticalIssue?: (issue: SyncHealth['issues'][0]) => void
  ) {
    this.onHealthChange = onHealthChange;
    this.onMetricsUpdate = onMetricsUpdate;
    this.onCriticalIssue = onCriticalIssue;
  }

  /**
   * Initialize sync monitor
   */
  async initialize(): Promise<void> {
    if (!this.storage) {
      this.storage = await getVolunteerStorage();
    }
    
    // Load historical events and metrics
    await this.loadHistoricalData();
    
    // Start real-time monitoring
    this.startMonitoring();
    
    console.log('📊 Sync monitor initialized');
  }

  /**
   * Record a sync event
   */
  recordEvent(event: Omit<SyncEvent, 'id'>): void {
    const syncEvent: SyncEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    this.events.push(syncEvent);
    
    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
    
    // Update real-time metrics
    this.updateRealTimeMetrics(syncEvent);
    
    // Check for critical issues
    this.checkForCriticalIssues(syncEvent);
    
    // Store event in IndexedDB
    this.storeEvent(syncEvent);
  }

  /**
   * Get current sync metrics
   */
  async getSyncMetrics(): Promise<SyncMetrics> {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp >= oneDayAgo);
    
    // Calculate sync performance
    const syncEvents = recentEvents.filter(e => e.type === 'sync_complete' || e.type === 'sync_error');
    const successfulSyncs = recentEvents.filter(e => e.type === 'sync_complete');
    const failedSyncs = recentEvents.filter(e => e.type === 'sync_error');
    
    const avgSyncTime = successfulSyncs.length > 0
      ? successfulSyncs.reduce((sum, e) => sum + (e.duration || 0), 0) / successfulSyncs.length
      : 0;
    
    const successRate = syncEvents.length > 0
      ? (successfulSyncs.length / syncEvents.length) * 100
      : 100;
    
    const throughput = syncEvents.length > 0
      ? (syncEvents.length / (24 * 60)) // actions per minute over 24h
      : 0;
    
    // Calculate queue metrics
    const queueMetrics = this.getMetricTimeSeries('queueDepth');
    const queueDepth = queueMetrics.length > 0 ? queueMetrics[queueMetrics.length - 1] : 0;
    const maxQueueDepth = queueMetrics.length > 0 ? Math.max(...queueMetrics) : 0;
    
    const queueWaitTimes = this.getMetricTimeSeries('queueWaitTime');
    const avgQueueWaitTime = queueWaitTimes.length > 0
      ? queueWaitTimes.reduce((sum, time) => sum + time, 0) / queueWaitTimes.length
      : 0;
    
    // Calculate network metrics
    const networkRequests = recentEvents.filter(e => e.metadata?.networkRequest).length;
    const networkErrors = recentEvents.filter(e => e.type === 'sync_error' && e.error?.includes('network')).length;
    
    const latencies = this.getMetricTimeSeries('networkLatency');
    const avgLatency = latencies.length > 0
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
      : 0;
    
    const dataTransferred = this.getMetricTimeSeries('dataTransferred')
      .reduce((sum, bytes) => sum + bytes, 0);
    
    // Calculate error metrics
    const timeoutErrors = failedSyncs.filter(e => e.error?.includes('timeout')).length;
    const conflictErrors = failedSyncs.filter(e => e.error?.includes('conflict')).length;
    const authErrors = failedSyncs.filter(e => e.error?.includes('auth')).length;
    const otherErrors = failedSyncs.length - timeoutErrors - conflictErrors - authErrors - networkErrors;
    
    return {
      avgSyncTime,
      successRate,
      throughput,
      queueDepth,
      maxQueueDepth,
      avgQueueWaitTime,
      networkRequests,
      networkErrors,
      avgLatency,
      dataTransferred,
      timeoutErrors,
      conflictErrors,
      authErrors,
      otherErrors,
    };
  }

  /**
   * Get sync health assessment
   */
  async getSyncHealth(): Promise<SyncHealth> {
    const metrics = await this.getSyncMetrics();
    const issues: SyncHealth['issues'] = [];
    
    // Calculate health indicators
    const syncSuccess = metrics.successRate;
    const responseTime = this.calculateResponseTimeScore(metrics.avgSyncTime);
    const queueHealth = this.calculateQueueHealthScore(metrics.queueDepth, metrics.maxQueueDepth);
    const errorRate = this.calculateErrorRateScore(metrics);
    const networkStability = this.calculateNetworkStabilityScore(metrics);
    
    // Detect issues and generate recommendations
    if (syncSuccess < 80) {
      issues.push({
        severity: syncSuccess < 50 ? 'critical' : 'high',
        category: 'reliability',
        description: `Sync success rate is only ${syncSuccess.toFixed(1)}%`,
        recommendation: 'Check network connectivity and server status. Consider increasing retry limits.',
      });
    }
    
    if (responseTime < 60) {
      issues.push({
        severity: responseTime < 30 ? 'high' : 'medium',
        category: 'performance',
        description: `Average sync time is ${metrics.avgSyncTime.toFixed(0)}ms`,
        recommendation: 'Optimize data payload size and consider batch processing.',
      });
    }
    
    if (queueHealth < 50) {
      issues.push({
        severity: 'high',
        category: 'capacity',
        description: `Sync queue is backing up (depth: ${metrics.queueDepth})`,
        recommendation: 'Increase concurrent sync workers or optimize sync frequency.',
      });
    }
    
    if (errorRate < 70) {
      issues.push({
        severity: errorRate < 40 ? 'critical' : 'high',
        category: 'reliability',
        description: 'High error rate detected in sync operations',
        recommendation: 'Investigate common error patterns and implement better error handling.',
      });
    }
    
    if (networkStability < 60) {
      issues.push({
        severity: 'medium',
        category: 'network',
        description: 'Network instability affecting sync performance',
        recommendation: 'Check network connection quality and consider offline-first strategies.',
      });
    }
    
    // Calculate overall health score
    const indicators = { syncSuccess, responseTime, queueHealth, errorRate, networkStability };
    const score = Object.values(indicators).reduce((sum, val) => sum + val, 0) / 5;
    
    const status = score >= 80 ? 'excellent' :
                  score >= 65 ? 'good' :
                  score >= 50 ? 'fair' :
                  score >= 30 ? 'poor' : 'critical';
    
    return {
      status,
      score,
      issues,
      indicators,
    };
  }

  /**
   * Get sync insights and recommendations
   */
  async getSyncInsights(): Promise<SyncInsights> {
    const metrics = await this.getSyncMetrics();
    const health = await this.getSyncHealth();
    
    // Generate optimization recommendations
    const recommendations: SyncInsights['recommendations'] = [];
    
    if (metrics.successRate < 90) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'Improve Sync Reliability',
        description: 'Implement more robust error handling and retry mechanisms',
        impact: 'Increase sync success rate by 10-15%',
        effort: 'medium',
      });
    }
    
    if (metrics.avgSyncTime > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Optimize Sync Performance',
        description: 'Reduce payload size and implement data compression',
        impact: 'Reduce sync time by 30-40%',
        effort: 'medium',
      });
    }
    
    if (metrics.queueDepth > 50) {
      recommendations.push({
        type: 'capacity',
        priority: 'high',
        title: 'Scale Sync Capacity',
        description: 'Increase concurrent sync workers and optimize queue processing',
        impact: 'Reduce queue wait times by 50%',
        effort: 'low',
      });
    }
    
    // Analyze trends
    const trends = this.analyzeTrends();
    
    // Analyze usage patterns
    const patterns = this.analyzeUsagePatterns();
    
    return {
      recommendations,
      trends,
      patterns,
    };
  }

  /**
   * Start real-time monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.getSyncMetrics();
        const health = await this.getSyncHealth();
        
        // Trigger callbacks
        if (this.onMetricsUpdate) {
          this.onMetricsUpdate(metrics);
        }
        
        if (this.onHealthChange) {
          this.onHealthChange(health);
        }
        
        // Check for critical issues
        const criticalIssues = health.issues.filter(issue => issue.severity === 'critical');
        if (criticalIssues.length > 0 && this.onCriticalIssue) {
          criticalIssues.forEach(issue => this.onCriticalIssue!(issue));
        }
        
      } catch (error) {
        console.error('Monitoring update failed:', error);
      }
    }, 30000); // Update every 30 seconds
    
    console.log('📊 Real-time sync monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
  }

  /**
   * Update real-time metrics based on events
   */
  private updateRealTimeMetrics(event: SyncEvent): void {
    const now = Date.now();
    
    switch (event.type) {
      case 'sync_complete':
        if (event.duration) {
          this.addMetricValue('syncTime', event.duration, now);
        }
        this.addMetricValue('syncSuccess', 1, now);
        break;
        
      case 'sync_error':
        this.addMetricValue('syncSuccess', 0, now);
        if (event.duration) {
          this.addMetricValue('syncTime', event.duration, now);
        }
        break;
        
      case 'queue_full':
        this.addMetricValue('queueDepth', event.metadata?.queueSize || 0, now);
        break;
        
      case 'network_change':
        if (event.metadata?.latency) {
          this.addMetricValue('networkLatency', event.metadata.latency, now);
        }
        break;
    }
  }

  /**
   * Add metric value with timestamp
   */
  private addMetricValue(metric: string, value: number, timestamp: number): void {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    
    const values = this.metrics.get(metric)!;
    values.push(value);
    
    // Keep only recent values (last 7 days)
    const cutoff = timestamp - this.METRICS_RETENTION;
    while (values.length > 0 && values[0] < cutoff) {
      values.shift();
    }
  }

  /**
   * Get time series data for a metric
   */
  private getMetricTimeSeries(metric: string): number[] {
    return this.metrics.get(metric) || [];
  }

  /**
   * Check for critical issues requiring immediate attention
   */
  private checkForCriticalIssues(event: SyncEvent): void {
    // Check for repeated failures
    const recentErrors = this.events
      .filter(e => e.type === 'sync_error' && e.timestamp > Date.now() - 5 * 60 * 1000)
      .slice(-10);
    
    if (recentErrors.length >= 8) { // 80% failure rate in last 10 attempts
      const issue = {
        severity: 'critical' as const,
        category: 'reliability' as const,
        description: 'High failure rate detected: 8/10 recent syncs failed',
        recommendation: 'Check network connectivity and server status immediately',
      };
      
      if (this.onCriticalIssue) {
        this.onCriticalIssue(issue);
      }
    }
    
    // Check for queue overflow
    if (event.type === 'queue_full' && event.metadata?.queueSize > 100) {
      const issue = {
        severity: 'critical' as const,
        category: 'capacity' as const,
        description: `Sync queue overflow: ${event.metadata.queueSize} pending actions`,
        recommendation: 'Increase sync capacity or clear queue manually',
      };
      
      if (this.onCriticalIssue) {
        this.onCriticalIssue(issue);
      }
    }
  }

  /**
   * Calculate health scores
   */
  private calculateResponseTimeScore(avgTime: number): number {
    // Score decreases as response time increases
    if (avgTime <= 500) return 100;
    if (avgTime <= 1000) return 80;
    if (avgTime <= 2000) return 60;
    if (avgTime <= 5000) return 40;
    return 20;
  }

  private calculateQueueHealthScore(current: number, max: number): number {
    if (max === 0) return 100;
    const ratio = current / max;
    if (ratio <= 0.2) return 100;
    if (ratio <= 0.4) return 80;
    if (ratio <= 0.6) return 60;
    if (ratio <= 0.8) return 40;
    return 20;
  }

  private calculateErrorRateScore(metrics: SyncMetrics): number {
    const errorRate = 100 - metrics.successRate;
    if (errorRate <= 5) return 100;
    if (errorRate <= 10) return 80;
    if (errorRate <= 20) return 60;
    if (errorRate <= 30) return 40;
    return 20;
  }

  private calculateNetworkStabilityScore(metrics: SyncMetrics): number {
    const networkErrorRate = metrics.networkRequests > 0 
      ? (metrics.networkErrors / metrics.networkRequests) * 100
      : 0;
    
    if (networkErrorRate <= 2) return 100;
    if (networkErrorRate <= 5) return 80;
    if (networkErrorRate <= 10) return 60;
    if (networkErrorRate <= 20) return 40;
    return 20;
  }

  /**
   * Analyze trends over time
   */
  private analyzeTrends(): SyncInsights['trends'] {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const twoDaysAgo = now - (48 * 60 * 60 * 1000);
    
    const recent = this.events.filter(e => e.timestamp >= oneDayAgo);
    const previous = this.events.filter(e => e.timestamp >= twoDaysAgo && e.timestamp < oneDayAgo);
    
    const syncVolume = this.comparePeriods(recent, previous, 'volume');
    const errorRate = this.comparePeriods(recent, previous, 'errors');
    const performance = this.comparePeriods(recent, previous, 'performance');
    const queueSize = this.comparePeriods(recent, previous, 'queue');
    
    return {
      syncVolume,
      errorRate,
      performance,
      queueSize,
    };
  }

  /**
   * Compare metrics between two periods
   */
  private comparePeriods(
    recent: SyncEvent[], 
    previous: SyncEvent[], 
    metric: 'volume' | 'errors' | 'performance' | 'queue'
  ): 'increasing' | 'stable' | 'decreasing' | 'improving' | 'degrading' | 'growing' | 'shrinking' {
    let recentValue = 0;
    let previousValue = 0;
    
    switch (metric) {
      case 'volume':
        recentValue = recent.filter(e => e.type === 'sync_complete').length;
        previousValue = previous.filter(e => e.type === 'sync_complete').length;
        break;
      case 'errors':
        recentValue = recent.filter(e => e.type === 'sync_error').length;
        previousValue = previous.filter(e => e.type === 'sync_error').length;
        break;
      case 'performance':
        const recentTimes = recent.filter(e => e.duration).map(e => e.duration!);
        const previousTimes = previous.filter(e => e.duration).map(e => e.duration!);
        recentValue = recentTimes.length > 0 ? recentTimes.reduce((sum, t) => sum + t, 0) / recentTimes.length : 0;
        previousValue = previousTimes.length > 0 ? previousTimes.reduce((sum, t) => sum + t, 0) / previousTimes.length : 0;
        break;
      case 'queue':
        // This would need to be tracked separately with queue size events
        return 'stable';
    }
    
    const change = (recentValue - previousValue) / Math.max(previousValue, 1);
    
    if (metric === 'volume' || metric === 'queue') {
      if (change > 0.1) return metric === 'queue' ? 'growing' : 'increasing';
      if (change < -0.1) return metric === 'queue' ? 'shrinking' : 'decreasing';
      return 'stable';
    } else { // errors, performance
      if (change > 0.1) return 'degrading';
      if (change < -0.1) return 'improving';
      return 'stable';
    }
  }

  /**
   * Analyze usage patterns
   */
  private analyzeUsagePatterns(): SyncInsights['patterns'] {
    const syncEvents = this.events.filter(e => e.type === 'sync_complete' || e.type === 'sync_error');
    
    // Peak hours analysis
    const hourCounts = new Array(24).fill(0);
    syncEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    });
    const maxCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count >= maxCount * 0.8)
      .map(({ hour }) => hour);
    
    // Busy days analysis
    const dayCounts: Record<string, number> = {};
    syncEvents.forEach(event => {
      const day = new Date(event.timestamp).toDateString();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const busyDays = Object.entries(dayCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);
    
    // Common errors analysis
    const errorEvents = this.events.filter(e => e.type === 'sync_error' && e.error);
    const errorCounts: Record<string, number> = {};
    errorEvents.forEach(event => {
      const error = event.error!.substring(0, 50); // Truncate for grouping
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
    const totalErrors = errorEvents.length;
    const commonErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({
        error,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Slowest operations analysis
    const completedEvents = this.events.filter(e => e.type === 'sync_complete' && e.duration);
    const operationTimes: Record<string, { total: number; count: number }> = {};
    
    completedEvents.forEach(event => {
      const operation = event.metadata?.operation || 'unknown';
      if (!operationTimes[operation]) {
        operationTimes[operation] = { total: 0, count: 0 };
      }
      operationTimes[operation].total += event.duration!;
      operationTimes[operation].count++;
    });
    
    const slowestOperations = Object.entries(operationTimes)
      .map(([operation, { total, count }]) => ({
        operation,
        avgTime: total / count,
        count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);
    
    return {
      peakHours,
      busyDays,
      commonErrors,
      slowestOperations,
    };
  }

  /**
   * Store event in IndexedDB
   */
  private async storeEvent(event: SyncEvent): Promise<void> {
    if (!this.storage) return;
    
    try {
      const document = {
        id: event.id,
        data: event,
        timestamp: event.timestamp,
        lastModified: Date.now(),
        userId: 'system',
        version: 1,
        synced: false,
        priority: 'low' as const,
        size: new Blob([JSON.stringify(event)]).size,
      };
      
      await this.storage.store('syncEvents', document);
    } catch (error) {
      console.warn('Failed to store sync event:', error);
    }
  }

  /**
   * Load historical data from storage
   */
  private async loadHistoricalData(): Promise<void> {
    if (!this.storage) return;
    
    try {
      const cutoff = Date.now() - this.METRICS_RETENTION;
      const storedEvents = await this.storage.query('syncEvents', {
        filter: (doc) => doc.timestamp >= cutoff && !doc.deleted
      });
      
      this.events = storedEvents
        .map(doc => doc.data as SyncEvent)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-this.MAX_EVENTS);
      
      console.log(`📊 Loaded ${this.events.length} historical sync events`);
    } catch (error) {
      console.warn('Failed to load historical sync data:', error);
    }
  }

  /**
   * Clean up old events and metrics
   */
  async cleanup(maxAge: number = this.METRICS_RETENTION): Promise<void> {
    const cutoff = Date.now() - maxAge;
    
    // Clean events
    this.events = this.events.filter(event => event.timestamp >= cutoff);
    
    // Clean metrics
    for (const [metric, values] of this.metrics.entries()) {
      const filteredValues = values.filter(value => value >= cutoff);
      this.metrics.set(metric, filteredValues);
    }
    
    // Clean storage
    if (this.storage) {
      try {
        const oldEvents = await this.storage.query('syncEvents', {
          filter: (doc) => doc.timestamp < cutoff
        });
        
        for (const event of oldEvents) {
          await this.storage.delete('syncEvents', event.id, true);
        }
        
        console.log(`🧹 Cleaned up ${oldEvents.length} old sync events`);
      } catch (error) {
        console.warn('Failed to cleanup old sync events:', error);
      }
    }
  }
}

// Singleton instance
let syncMonitorInstance: SyncMonitor | null = null;

/**
 * Get the singleton sync monitor instance
 */
export const getSyncMonitor = (
  onHealthChange?: (health: SyncHealth) => void,
  onMetricsUpdate?: (metrics: SyncMetrics) => void,
  onCriticalIssue?: (issue: SyncHealth['issues'][0]) => void
): SyncMonitor => {
  if (!syncMonitorInstance) {
    syncMonitorInstance = new SyncMonitor(onHealthChange, onMetricsUpdate, onCriticalIssue);
  }
  return syncMonitorInstance;
};

export default SyncMonitor;