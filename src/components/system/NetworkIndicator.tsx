'use client';

import React from 'react';
import { useOffline, ConnectionQuality, SyncStatus } from '@/context/OfflineContext';
import { Wifi, WifiOff, Signal, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface NetworkIndicatorProps {
  showDetails?: boolean;
  className?: string;
  compact?: boolean;
}

export const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({
  showDetails = false,
  className = '',
  compact = false,
}) => {
  const {
    isOnline,
    connectionQuality,
    syncStatus,
    pendingActions,
    lastSyncTime,
    networkMetrics,
  } = useOffline();

  // Get display information based on connection status
  const getConnectionInfo = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: 'text-red-500 bg-red-50',
        label: 'Offline',
        description: 'Working with cached data',
      };
    }

    switch (connectionQuality) {
      case ConnectionQuality.EXCELLENT:
        return {
          icon: Wifi,
          color: 'text-green-600 bg-green-50',
          label: 'Excellent',
          description: 'Fast connection',
        };
      case ConnectionQuality.GOOD:
        return {
          icon: Wifi,
          color: 'text-green-500 bg-green-50',
          label: 'Good',
          description: 'Stable connection',
        };
      case ConnectionQuality.FAIR:
        return {
          icon: Signal,
          color: 'text-yellow-500 bg-yellow-50',
          label: 'Fair',
          description: 'Slower connection',
        };
      case ConnectionQuality.POOR:
        return {
          icon: Signal,
          color: 'text-orange-500 bg-orange-50',
          label: 'Poor',
          description: 'Unstable connection',
        };
      default:
        return {
          icon: Wifi,
          color: 'text-gray-500 bg-gray-50',
          label: 'Unknown',
          description: 'Checking connection',
        };
    }
  };

  // Get sync status information
  const getSyncInfo = () => {
    switch (syncStatus) {
      case SyncStatus.SYNCING:
        return {
          icon: RefreshCw,
          color: 'text-blue-500',
          label: 'Syncing',
          spinning: true,
        };
      case SyncStatus.SUCCESS:
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          label: 'Synced',
          spinning: false,
        };
      case SyncStatus.ERROR:
        return {
          icon: AlertTriangle,
          color: 'text-red-500',
          label: 'Sync Error',
          spinning: false,
        };
      default:
        return pendingActions.length > 0
          ? {
              icon: Clock,
              color: 'text-yellow-500',
              label: `${pendingActions.length} Pending`,
              spinning: false,
            }
          : null;
    }
  };

  const connectionInfo = getConnectionInfo();
  const syncInfo = getSyncInfo();

  // Format last sync time
  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Connection status */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${connectionInfo.color}`}>
          <connectionInfo.icon className="w-3 h-3" />
          <span className="hidden sm:inline">{connectionInfo.label}</span>
        </div>

        {/* Sync status */}
        {syncInfo && (
          <div className={`flex items-center gap-1 ${syncInfo.color}`}>
            <syncInfo.icon 
              className={`w-4 h-4 ${syncInfo.spinning ? 'animate-spin' : ''}`} 
            />
            {pendingActions.length > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-medium">
                {pendingActions.length}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">Network Status</h3>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${connectionInfo.color}`}>
          <connectionInfo.icon className="w-3 h-3" />
          <span>{connectionInfo.label}</span>
        </div>
      </div>

      {/* Connection details */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {connectionInfo.description}
          </span>
        </div>

        {networkMetrics && isOnline && (
          <>
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="capitalize">{networkMetrics.connectionType}</span>
            </div>
            <div className="flex justify-between">
              <span>Speed:</span>
              <span>{Math.round(networkMetrics.downloadSpeed)} kbps</span>
            </div>
            <div className="flex justify-between">
              <span>Latency:</span>
              <span>{networkMetrics.latency}ms</span>
            </div>
          </>
        )}

        {/* Sync information */}
        <div className="border-t border-gray-100 pt-2 mt-3">
          <div className="flex justify-between items-center">
            <span>Sync Status:</span>
            {syncInfo ? (
              <div className={`flex items-center gap-1 ${syncInfo.color}`}>
                <syncInfo.icon 
                  className={`w-4 h-4 ${syncInfo.spinning ? 'animate-spin' : ''}`} 
                />
                <span className="text-xs">{syncInfo.label}</span>
              </div>
            ) : (
              <span className="text-green-600 text-xs">Up to date</span>
            )}
          </div>

          {pendingActions.length > 0 && (
            <div className="flex justify-between mt-1">
              <span>Pending Actions:</span>
              <span className="text-yellow-600 font-medium">{pendingActions.length}</span>
            </div>
          )}

          <div className="flex justify-between mt-1">
            <span>Last Sync:</span>
            <span className="text-xs">{formatLastSync(lastSyncTime)}</span>
          </div>
        </div>

        {/* Show detailed info if requested */}
        {showDetails && pendingActions.length > 0 && (
          <div className="border-t border-gray-100 pt-2 mt-3">
            <div className="text-xs text-gray-500 mb-2">Pending Actions:</div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {pendingActions.slice(0, 3).map((action) => (
                <div key={action.id} className="flex justify-between items-center text-xs">
                  <span className="truncate pr-2">{action.description}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    action.priority === 'high' 
                      ? 'bg-red-100 text-red-700'
                      : action.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {action.priority}
                  </span>
                </div>
              ))}
              {pendingActions.length > 3 && (
                <div className="text-xs text-gray-400 text-center pt-1">
                  +{pendingActions.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkIndicator;