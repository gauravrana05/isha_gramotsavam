'use client';

import React from 'react';
import { usePublicOffline } from '@/context/PublicOfflineContext';
import { Wifi, WifiOff, Database, Globe } from 'lucide-react';

export const PublicOfflineIndicator: React.FC = () => {
  const { 
    isOnline, 
    connectionQuality,
    hasCachedData,
    lastSyncTime 
  } = usePublicOffline();

  // Don't show indicator if online and no special status
  if (isOnline && connectionQuality !== 'poor') {
    return null;
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4 text-red-500" />;
    if (connectionQuality === 'poor') return <Wifi className="h-4 w-4 text-yellow-500" />;
    return <Globe className="h-4 w-4 text-blue-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return hasCachedData() 
        ? 'Offline - Viewing cached content'
        : 'Offline - Limited content available';
    }
    if (connectionQuality === 'poor') return 'Slow connection - Loading may take time';
    return 'Online';
  };

  const getStatusColor = () => {
    if (!isOnline) {
      return hasCachedData() 
        ? 'bg-blue-50 border-blue-200 text-blue-800' 
        : 'bg-red-50 border-red-200 text-red-800';
    }
    if (connectionQuality === 'poor') return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-green-50 border-green-200 text-green-800';
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium max-w-xs ${getStatusColor()}`}>
      <Globe className="h-4 w-4" />
      {getStatusIcon()}
      <div className="flex-1">
        <div>{getStatusText()}</div>
        {!isOnline && hasCachedData() && (
          <div className="flex items-center gap-1 text-xs opacity-75 mt-1">
            <Database className="h-3 w-3" />
            <span>Cached data available</span>
          </div>
        )}
        {lastSyncTime && (
          <div className="text-xs opacity-75 mt-1">
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};