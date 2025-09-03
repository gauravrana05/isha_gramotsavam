'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContextWrapper';
import Link from 'next/link';
import { MediaUpload } from '@/components/media/MediaUpload';
import { ArrowLeft, Trophy, Target, Loader2, Wifi, WifiOff, Upload, CloudOff } from 'lucide-react';

interface ContextInfo {
  type: 'fixture' | 'match' | null;
  id: string | null;
  name: string | null;
  level?: string;
  teams?: string[];
}

export default function MediaUploadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { venueId } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contextInfo, setContextInfo] = useState<ContextInfo>({
    type: null,
    id: null,
    name: null
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setError('Please log in to access this page');
      setLoading(false);
      return;
    }

    loadContextInfo();
  }, [user, authLoading, searchParams]);

  const loadContextInfo = async () => {
    try {
      setLoading(true);
      
      const fixtureId = searchParams.get('fixtureId');
      const matchId = searchParams.get('matchId');
      
      if (fixtureId) {
        // Load fixture info
        setContextInfo({
          type: 'fixture',
          id: fixtureId,
          name: `Tournament #${fixtureId}`,
          level: 'Unknown'
        });
      } else if (matchId) {
        // Load match info
        setContextInfo({
          type: 'match',
          id: matchId,
          name: `Match #${matchId}`,
          teams: ['Team A', 'Team B']
        });
      } else {
        // General venue upload
        setContextInfo({
          type: null,
          id: null,
          name: null
        });
      }
    } catch (err) {
      // Error handling removed
      setError('Failed to load context information');
    } finally {
      setLoading(false);
    }
  };

  // Content loading state (keeps sidebar visible)
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] py-4 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Loading Header Skeleton */}
          <div className="mb-8">
            <div className="animate-pulse">
              <div className="flex items-center mb-4">
                <div className="w-6 h-6 bg-gray-200 rounded mr-3"></div>
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>

          {/* Loading Upload Card */}
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-6"></div>
              
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32 mx-auto"></div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </div>

          {/* Loading Main Content */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F28C38] mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <button 
            onClick={loadContextInfo}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getContextDisplay = () => {
    if (!contextInfo.type) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Target className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">General Venue Upload</h3>
              <p className="text-sm text-blue-700">Media will be tagged to this venue</p>
            </div>
          </div>
        </div>
      );
    }

    if (contextInfo.type === 'fixture') {
      return (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Trophy className="w-5 h-5 text-purple-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-purple-900">Tournament Upload</h3>
              <p className="text-sm text-purple-700">
                Media will be tagged to: {contextInfo.name}
                {contextInfo.level && ` (${contextInfo.level})`}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (contextInfo.type === 'match') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Target className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-green-900">Match Upload</h3>
              <p className="text-sm text-green-700">
                Media will be tagged to: {contextInfo.name}
                {contextInfo.teams && ` (${contextInfo.teams.join(' vs ')})`}
              </p>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link href={`/en/volunteer/venues/${venueId}/media`} className="mr-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Media</h1>
          <p className="text-gray-600 text-sm">
            Upload photos and videos for 
            {contextInfo.type === 'fixture' && ' this tournament'}
            {contextInfo.type === 'match' && ' this match'}
            {!contextInfo.type && ' this venue'}
          </p>
        </div>
      </div>

      {/* Context Information */}
      {getContextDisplay()}

      {/* Media Upload Component */}
      <MediaUpload 
        contextType={contextInfo.type}
        contextId={contextInfo.id}
        venueId={venueId}
      />
    </div>
  );
}