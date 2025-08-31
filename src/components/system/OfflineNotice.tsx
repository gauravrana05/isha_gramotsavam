'use client';

import React, { useState } from 'react';
import { useOffline, ConnectionQuality } from '@/context/OfflineContext';
import { WifiOff, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';

interface OfflineNoticeProps {
  persistent?: boolean; // Don't allow dismissing
  showDetails?: boolean;
  className?: string;
}

export const OfflineNotice: React.FC<OfflineNoticeProps> = ({
  persistent = false,
  showDetails = true,
  className = '',
}) => {
  const [dismissed, setDismissed] = useState(false);
  const {
    isOnline,
    connectionQuality,
    cacheInfo,
    checkConnection,
    pendingActions,
  } = useOffline();

  // Don't show if online or dismissed (unless persistent)
  if (isOnline || (dismissed && !persistent)) {
    return null;
  }

  const handleCheckConnection = async () => {
    try {
      await checkConnection();
    } catch (error) {
      console.warn('Failed to check connection:', error);
    }
  };

  return (
    <div className={`rounded-lg border-2 border-orange-200 bg-orange-50 p-4 mb-4 ${className}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-orange-600">
          <WifiOff className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-orange-800 text-sm">
              Working Offline
            </h3>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCheckConnection}
                className="p-1.5 rounded-md hover:bg-orange-100 transition-colors"
                title="Check connection"
              >
                <RefreshCw className="w-4 h-4 text-orange-600" />
              </button>
              
              {!persistent && (
                <button
                  onClick={() => setDismissed(true)}
                  className="p-1.5 rounded-md hover:bg-orange-100 transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4 text-orange-600" />
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-orange-700 mb-3">
            You're working with cached data. All your changes will be saved and synchronized when you're back online.
          </p>

          {/* Offline capabilities */}
          <div className="bg-white rounded-lg p-3 mb-3 border border-orange-200">
            <h4 className="font-medium text-orange-800 text-xs uppercase tracking-wide mb-2">
              Available Offline:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">Team check-ins</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">Player verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">Match scoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-700">View cached data</span>
              </div>
            </div>
          </div>

          {/* Cache info */}
          {showDetails && cacheInfo && (
            <div className="bg-white rounded-lg p-3 border border-orange-200">
              <h4 className="font-medium text-orange-800 text-xs uppercase tracking-wide mb-2">
                Cached Data:
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Teams:</span>
                  <span className="font-medium text-gray-800">{cacheInfo.teamCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Players:</span>
                  <span className="font-medium text-gray-800">{cacheInfo.playerCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Matches:</span>
                  <span className="font-medium text-gray-800">{cacheInfo.matchCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-medium text-orange-600">{pendingActions.length}</span>
                </div>
              </div>
              
              {cacheInfo.lastSync && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Last sync:</span>
                    <span className="text-gray-600">
                      {new Date(cacheInfo.lastSync).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending actions warning */}
          {pendingActions.length > 0 && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <span className="font-medium text-yellow-800 text-sm">
                  {pendingActions.length} actions waiting to sync
                </span>
              </div>
              <p className="text-xs text-yellow-700">
                These will be automatically uploaded when connection is restored.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Compact banner version for header/top of page
export const OfflineBanner: React.FC<{
  onDismiss?: () => void;
}> = ({ onDismiss }) => {
  const { isOnline, pendingActions } = useOffline();

  if (isOnline) return null;

  return (
    <div className="bg-orange-500 text-white px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              Working Offline
            </span>
            {pendingActions.length > 0 && (
              <span className="text-xs bg-orange-600 px-2 py-1 rounded-full">
                {pendingActions.length} pending
              </span>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-orange-600 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineNotice;