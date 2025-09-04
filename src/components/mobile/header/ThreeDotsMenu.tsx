'use client';

import { MoreVertical, Settings, RefreshCw, HelpCircle, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/component-patterns';

interface ThreeDotsMenuProps {
  onMenuAction: (action: string) => void;
  user: any;
  isOnline?: boolean;
  syncStatus?: 'idle' | 'syncing' | 'error';
}

export function ThreeDotsMenu({ 
  onMenuAction, 
  user, 
  isOnline = true,
  syncStatus = 'idle'
}: ThreeDotsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: string) => {
    setIsOpen(false);
    onMenuAction(action);
  };

  const getSyncIcon = () => {
    if (syncStatus === 'syncing') {
      return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
    }
    return <RefreshCw size={16} className="text-gray-500" />;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-[#4A5568] hover:text-[#2D3748] transition-colors"
      >
        <MoreVertical size={20} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {/* Connection Status */}
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Connection</span>
                <div className="flex items-center">
                  {isOnline ? (
                    <Wifi size={16} className="text-green-500 mr-2" />
                  ) : (
                    <WifiOff size={16} className="text-red-500 mr-2" />
                  )}
                  <span className={cn(
                    'text-xs font-medium',
                    isOnline ? 'text-green-600' : 'text-red-600'
                  )}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => handleAction('sync')}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                disabled={syncStatus === 'syncing'}
              >
                {getSyncIcon()}
                <span className="ml-3">
                  {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Data'}
                </span>
              </button>

              <button
                onClick={() => handleAction('settings')}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Settings size={16} className="text-gray-500" />
                <span className="ml-3">Settings</span>
              </button>

              <button
                onClick={() => handleAction('help')}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <HelpCircle size={16} className="text-gray-500" />
                <span className="ml-3">Help & Support</span>
              </button>
            </div>

            {/* User Info */}
            <div className="border-t border-gray-100 px-4 py-2">
              <div className="text-xs text-gray-500">
                Signed in as {user?.role}
              </div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </div>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 py-1">
              <button
                onClick={() => handleAction('logout')}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} className="text-red-500" />
                <span className="ml-3">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
