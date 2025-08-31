'use client';

import React from 'react';
import { useOffline } from '@/context/OfflineContextWrapper';
import { Wifi, WifiOff, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface OfflineStatusBannerProps {
  className?: string;
  showConnectionQuality?: boolean;
}

export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({ 
  className = "", 
  showConnectionQuality = false 
}) => {
  const { isOnline, connectionQuality, syncStatus, pendingActions } = useOffline();

  if (isOnline && syncStatus !== 'syncing' && pendingActions.length === 0) {
    return null; // Don't show banner when everything is normal
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-yellow-100 border border-yellow-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-yellow-800">
            <WifiOff className="w-5 h-5" />
            <div className="flex-1">
              <p className="font-medium">Working Offline</p>
              <p className="text-sm">Changes will sync when connection returns</p>
            </div>
            {pendingActions.length > 0 && (
              <div className="bg-yellow-200 px-3 py-1 rounded-full">
                <span className="text-sm font-medium">{pendingActions.length} pending</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Status Banner */}
      {isOnline && syncStatus === 'syncing' && (
        <div className="bg-blue-100 border border-blue-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-blue-800">
            <Upload className="w-5 h-5 animate-pulse" />
            <div className="flex-1">
              <p className="font-medium">Syncing Changes</p>
              <p className="text-sm">Uploading offline actions...</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {isOnline && syncStatus === 'success' && pendingActions.length === 0 && (
        <div className="bg-green-100 border border-green-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <div className="flex-1">
              <p className="font-medium">All Changes Synced</p>
              <p className="text-sm">Everything is up to date</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Quality Indicator */}
      {showConnectionQuality && isOnline && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Wifi className="w-4 h-4 text-green-500" />
          <span>Online ({connectionQuality})</span>
        </div>
      )}
    </div>
  );
};

export default OfflineStatusBanner;
