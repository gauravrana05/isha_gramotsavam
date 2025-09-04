'use client';

import { useState, useEffect } from 'react';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { 
  Activity, 
  Database, 
  Zap, 
  Clock, 
  HardDrive,
  TrendingUp,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface PerformanceMonitorProps {
  venueId?: string;
  className?: string;
  showDetails?: boolean;
}

export function PerformanceMonitor({ venueId, className = '', showDetails = false }: PerformanceMonitorProps) {
  const { metrics, isOptimizing, optimizeMemory, preloadCriticalData, startBackgroundRefresh } = usePerformanceOptimization();
  const [showDropdown, setShowDropdown] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPerformanceStatus = () => {
    if (isOptimizing) return { color: 'text-blue-500', text: 'Optimizing...' };
    if (metrics.averageLoadTime > 2000) return { color: 'text-red-500', text: 'Slow' };
    if (metrics.averageLoadTime > 1000) return { color: 'text-yellow-500', text: 'Fair' };
    return { color: 'text-green-500', text: 'Good' };
  };

  const getMemoryStatus = () => {
    if (!metrics.memoryStats) return { color: 'text-gray-500', text: 'Unknown' };
    
    const usagePercent = (metrics.memoryStats.usedSize / (metrics.memoryStats.usedSize + metrics.memoryStats.availableSize)) * 100;
    
    if (usagePercent > 80) return { color: 'text-red-500', text: 'High' };
    if (usagePercent > 60) return { color: 'text-yellow-500', text: 'Medium' };
    return { color: 'text-green-500', text: 'Low' };
  };

  const status = getPerformanceStatus();
  const memoryStatus = getMemoryStatus();

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${status.color} hover:bg-gray-100`}
        disabled={isOptimizing}
      >
        <Activity className="w-4 h-4" />
        <span>{status.text}</span>
        {isOptimizing && <RefreshCw className="w-3 h-3 animate-spin" />}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            {/* Performance Overview */}
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Performance Monitor</span>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600">Load Time</span>
                </div>
                <div className="font-semibold text-lg text-blue-700">
                  {formatTime(metrics.averageLoadTime)}
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Cache Hit</span>
                </div>
                <div className="font-semibold text-lg text-green-700">
                  {(metrics.cacheHitRate * 100).toFixed(1)}%
                </div>
              </div>

              <div className={`${memoryStatus.color.includes('red') ? 'bg-red-50' : memoryStatus.color.includes('yellow') ? 'bg-yellow-50' : 'bg-green-50'} p-3 rounded`}>
                <div className="flex items-center gap-2 mb-1">
                  <HardDrive className="w-4 h-4" />
                  <span className="text-sm">Memory</span>
                </div>
                <div className="font-semibold text-lg">
                  {metrics.memoryStats ? formatBytes(metrics.memoryStats.usedSize) : 'N/A'}
                </div>
              </div>

              <div className="bg-purple-50 p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-600">Background</span>
                </div>
                <div className="font-semibold text-lg text-purple-700">
                  {metrics.backgroundTasksActive}
                </div>
              </div>
            </div>

            {/* Memory Details */}
            {metrics.memoryStats && (
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="text-sm font-medium text-gray-700 mb-2">Memory Usage</div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Used:</span>
                    <span>{formatBytes(metrics.memoryStats.usedSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available:</span>
                    <span>{formatBytes(metrics.memoryStats.availableSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{metrics.memoryStats.itemCount}</span>
                  </div>
                </div>
                
                {/* Memory usage bar */}
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        memoryStatus.color.includes('red') ? 'bg-red-500' : 
                        memoryStatus.color.includes('yellow') ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, (metrics.memoryStats.usedSize / (metrics.memoryStats.usedSize + metrics.memoryStats.availableSize)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Performance Actions */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 mb-2">Optimization Actions:</div>
              
              <button
                onClick={() => optimizeMemory()}
                disabled={isOptimizing}
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <HardDrive className="w-4 h-4" />
                Optimize Memory
              </button>
              
              {venueId && (
                <>
                  <button
                    onClick={() => preloadCriticalData(venueId)}
                    disabled={isOptimizing}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Database className="w-4 h-4" />
                    Preload Data
                  </button>
                  
                  <button
                    onClick={() => startBackgroundRefresh(venueId)}
                    disabled={isOptimizing}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Background Refresh
                  </button>
                </>
              )}
            </div>

            {/* Performance Warnings */}
            {(metrics.averageLoadTime > 2000 || (metrics.memoryStats && metrics.memoryStats.usedSize > metrics.memoryStats.availableSize * 0.8)) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Performance optimization recommended</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PerformanceMonitor;
