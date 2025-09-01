'use client';

import React from 'react';
import { useCaptainOffline } from '@/context/CaptainOfflineContext';
import { Wifi, WifiOff, Upload, CheckCircle, AlertCircle, Clock, Users } from 'lucide-react';

export const CaptainOfflineIndicator: React.FC = () => {
  const { 
    isOnline, 
    pendingActions, 
    syncStatus, 
    lastSyncTime 
  } = useCaptainOffline();

  if (isOnline && pendingActions.length === 0 && syncStatus === 'idle') {
    return null;
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4 text-red-500" />;
    if (syncStatus === 'syncing') return <Upload className="h-4 w-4 text-blue-500 animate-spin" />;
    if (syncStatus === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (pendingActions.length > 0) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline - Team changes will sync when online';
    if (syncStatus === 'syncing') return 'Syncing team data...';
    if (syncStatus === 'error') return 'Team sync failed - Will retry automatically';
    if (pendingActions.length > 0) return `${pendingActions.length} team changes pending`;
    return 'All team data synced';
  };

  const getStatusColor = () => {
    if (!isOnline || syncStatus === 'error') return 'bg-red-50 border-red-200 text-red-800';
    if (syncStatus === 'syncing') return 'bg-blue-50 border-blue-200 text-blue-800';
    if (pendingActions.length > 0) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-green-50 border-green-200 text-green-800';
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${getStatusColor()}`}>
      <Users className="h-4 w-4" />
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      {lastSyncTime && (
        <span className="text-xs opacity-75">
          Last sync: {lastSyncTime.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};
