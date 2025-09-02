'use client';

import React from 'react';
import { useOffline, SyncStatus } from '@/context/OfflineContextWrapper';
import { RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface SyncProgressProps {
  onDismiss?: () => void;
  showWhenIdle?: boolean;
  className?: string;
}

export const SyncProgress: React.FC<SyncProgressProps> = ({
  onDismiss,
  showWhenIdle = false,
  className = '',
}) => {
  const {
    syncStatus,
    syncProgress,
    pendingActions,
    isOnline,
    forcSync,
  } = useOffline();

  // Don't show if idle and showWhenIdle is false
  if (syncStatus === SyncStatus.IDLE && !showWhenIdle && pendingActions.length === 0) {
    return null;
  }

  // Don't show if offline and no pending actions
  if (!isOnline && pendingActions.length === 0) {
    return null;
  }

  const getSyncStatusInfo = () => {
    switch (syncStatus) {
      case SyncStatus.SYNCING:
        return {
          icon: RefreshCw,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50 border-blue-200',
          title: 'Syncing data...',
          description: `Uploading ${pendingActions.length} actions`,
          showProgress: true,
          spinning: true,
        };
      
      case SyncStatus.SUCCESS:
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50 border-green-200',
          title: 'Sync completed',
          description: 'All data synchronized successfully',
          showProgress: false,
          spinning: false,
        };
      
      case SyncStatus.ERROR:
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50 border-red-200',
          title: 'Sync failed',
          description: 'Some actions could not be synchronized',
          showProgress: false,
          spinning: false,
        };
      
      default:
        if (pendingActions.length > 0) {
          return {
            icon: RefreshCw,
            iconColor: 'text-yellow-500',
            bgColor: 'bg-yellow-50 border-yellow-200',
            title: `${pendingActions.length} pending actions`,
            description: isOnline ? 'Tap to sync now' : 'Will sync when online',
            showProgress: false,
            spinning: false,
          };
        }
        
        return {
          icon: CheckCircle,
          iconColor: 'text-gray-400',
          bgColor: 'bg-gray-50 border-gray-200',
          title: 'All synced',
          description: 'No pending actions',
          showProgress: false,
          spinning: false,
        };
    }
  };

  const statusInfo = getSyncStatusInfo();

  const handleSyncClick = () => {
    if (syncStatus !== SyncStatus.SYNCING && isOnline && pendingActions.length > 0) {
      forcSync();
    }
  };

  return (
    <div className={`rounded-lg border p-4 transition-all duration-300 ${statusInfo.bgColor} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Status icon */}
          <div className={`flex-shrink-0 ${statusInfo.iconColor}`}>
            <statusInfo.icon 
              className={`w-5 h-5 ${statusInfo.spinning ? 'animate-spin' : ''}`} 
            />
          </div>

          {/* Status content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 text-sm">
              {statusInfo.title}
            </h4>
            <p className="text-xs text-gray-600 mt-0.5">
              {statusInfo.description}
            </p>

            {/* Progress bar */}
            {statusInfo.showProgress && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Progress</span>
                  <span className="text-xs font-medium text-gray-700">
                    {syncProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-3">
          {/* Sync button */}
          {syncStatus === SyncStatus.IDLE && pendingActions.length > 0 && isOnline && (
            <button
              onClick={handleSyncClick}
              className="p-1.5 rounded-md bg-white hover:bg-gray-50 border border-gray-200 transition-colors"
              title="Sync now"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          )}

          {/* Dismiss button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 rounded-md hover:bg-white/50 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Pending actions list (when not syncing) */}
      {syncStatus !== SyncStatus.SYNCING && pendingActions.length > 0 && pendingActions.length <= 3 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-1">
            {pendingActions.map((action) => (
              <div key={action.id} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    action.priority === 'high' 
                      ? 'bg-red-400'
                      : action.priority === 'medium'
                      ? 'bg-yellow-400'
                      : 'bg-gray-400'
                  }`} />
                  <span className="text-gray-700 truncate">{action.description}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 flex-shrink-0 ml-2">
                  {action.retryCount > 0 && (
                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      retry {action.retryCount}
                    </span>
                  )}
                  <span className="text-xs">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show count if more than 3 pending actions */}
      {syncStatus !== SyncStatus.SYNCING && pendingActions.length > 3 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600 text-center">
            {pendingActions.length} actions waiting to sync
          </div>
        </div>
      )}
    </div>
  );
};

// Floating sync progress indicator for bottom of screen
export const FloatingSyncProgress: React.FC<{
  onDismiss?: () => void;
}> = ({ onDismiss }) => {
  const { syncStatus, pendingActions } = useOffline();

  // Only show when there's something to sync or actively syncing
  if (syncStatus === SyncStatus.IDLE && pendingActions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <SyncProgress 
        onDismiss={onDismiss}
        className="shadow-lg"
      />
    </div>
  );
};

export default SyncProgress;