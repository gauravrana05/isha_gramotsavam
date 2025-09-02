'use client';

import React from 'react';
import { usePublicOffline } from '@/context/PublicOfflineContext';
import { WifiOff, Database, RefreshCw, Home, Calendar, Trophy } from 'lucide-react';
import Link from 'next/link';

interface OfflineFallbackProps {
  requestedContent?: string;
  showCachedAlternatives?: boolean;
}

export const OfflineFallback: React.FC<OfflineFallbackProps> = ({ 
  requestedContent = 'page',
  showCachedAlternatives = true
}) => {
  const { publicData, hasCachedData } = usePublicOffline();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Offline Icon */}
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-red-600" />
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          You're Offline
        </h1>
        
        <p className="text-gray-600 mb-8">
          This {requestedContent} isn't available offline. Please check your internet connection and try again.
        </p>

        {/* Action Buttons */}
        <div className="space-y-4 mb-8">
          <button
            onClick={handleRetry}
            className="w-full bg-[#F28C38] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#E67A26] transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          
          <Link
            href="/en"
            className="w-full bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 inline-block"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </Link>
        </div>

        {/* Cached Content Alternatives */}
        {showCachedAlternatives && hasCachedData() && (
          <div className="bg-blue-50 rounded-lg p-6 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Available Offline Content</h3>
            </div>
            
            <div className="space-y-3">
              {publicData.events.length > 0 && (
                <div className="flex items-center gap-2 text-blue-700">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{publicData.events.length} cached events</span>
                </div>
              )}
              
              {publicData.sports.length > 0 && (
                <div className="flex items-center gap-2 text-blue-700">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm">{publicData.sports.length} cached sports</span>
                </div>
              )}
              
              {Object.keys(publicData.cachedPages).length > 0 && (
                <div className="flex items-center gap-2 text-blue-700">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">{Object.keys(publicData.cachedPages).length} cached pages</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-blue-600">
                💡 Some content may be available from your previous visits
              </p>
            </div>
          </div>
        )}

        {/* No Cached Content */}
        {showCachedAlternatives && !hasCachedData() && (
          <div className="bg-gray-100 rounded-lg p-6">
            <p className="text-sm text-gray-600">
              No offline content is currently cached. Visit pages while online to view them offline later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};