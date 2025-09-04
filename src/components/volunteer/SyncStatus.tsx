'use client';

import { useState, useEffect } from 'react';
import { useOffline } from '@/context/OfflineContextWrapper';
import { useEnhancedSync } from '@/hooks/useEnhancedSync';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Zap,
  Package,
  AlertTriangle
} from 'lucide-react';

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatus({ className = '', showDetails = false }: SyncStatusProps) {
  const { isOnline, lastSyncTime } = useOffline();
  const { isSyncing, syncStats, lastSyncResult, syncWithRetry, batchSync, syncHighPriority } = useEnhancedSync();
  const [showDropdown, setShowDropdown] = useState(false);

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (syncStats.totalPending === 0) return 'text-green-500';
    if (syncStats.highPriority > 0) return 'text-orange-500';
    if (syncStats.failedActions > 0) return 'text-yellow-500';
    return 'text-blue-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (syncStats.totalPending === 0) return <CheckCircle className="w-4 h-4" />;
    if (syncStats.failedActions > 0) return <AlertTriangle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (syncStats.totalPending === 0) return 'Synced';
    return `${syncStats.totalPending} pending`;
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const now = Date.now();
    const diff = now - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const handleSyncAction = async (action: 'all' | 'batch' | 'priority') => {
    setShowDropdown(false);
    
    switch (action) {
      case 'all':
        await syncWithRetry();
        break;
      case 'batch':
        await batchSync();
        break;
      case 'priority':
        await syncHighPriority();
        break;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${getStatusColor()} hover:bg-gray-100`}
        disabled={isSyncing}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {isSyncing && (
                <span className="text-sm text-blue-600 ml-auto">Syncing...</span>
              )}
            </div>

            {/* Sync Statistics */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-600">Total Pending</div>
                <div className="font-semibold text-lg">{syncStats.totalPending}</div>
              </div>
              
              <div className="bg-orange-50 p-2 rounded">
                <div className="text-orange-600">High Priority</div>
                <div className="font-semibold text-lg text-orange-700">{syncStats.highPriority}</div>
              </div>
              
              <div className="bg-yellow-50 p-2 rounded">
                <div className="text-yellow-600">Failed</div>
                <div className="font-semibold text-lg text-yellow-700">{syncStats.failedActions}</div>
              </div>
              
              <div className="bg-blue-50 p-2 rounded">
                <div className="text-blue-600">Max Retries</div>
                <div className="font-semibold text-lg text-blue-700">{syncStats.maxRetries}</div>
              </div>
            </div>

            {/* Last Sync Info */}
            <div className="flex justify-between text-sm text-gray-600 mb-4">
              <span>Last sync:</span>
              <span className="font-medium">{formatLastSync()}</span>
            </div>

            {/* Last Sync Result */}
            {lastSyncResult && (
              <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">Last Result:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    lastSyncResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {lastSyncResult.success ? 'Success' : 'Partial'}
                  </span>
                </div>
                <div className="text-gray-600">
                  ✅ {lastSyncResult.syncedCount} synced, ❌ {lastSyncResult.failedCount} failed
                </div>
              </div>
            )}

            {/* Sync Actions */}
            {isOnline && syncStats.totalPending > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 mb-2">Sync Actions:</div>
                
                <button
                  onClick={() => handleSyncAction('priority')}
                  disabled={isSyncing || syncStats.highPriority === 0}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Zap className="w-4 h-4" />
                  Sync High Priority ({syncStats.highPriority})
                </button>
                
                <button
                  onClick={() => handleSyncAction('batch')}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Package className="w-4 h-4" />
                  Batch Sync All
                </button>
                
                <button
                  onClick={() => handleSyncAction('all')}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sync with Retry
                </button>
              </div>
            )}

            {/* Offline Message */}
            {!isOnline && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>Actions will sync automatically when online</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SyncStatus;
