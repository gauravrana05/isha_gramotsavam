'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOfflineVenueData } from '@/hooks/useOfflineVenueData';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import PostFeed from '@/components/posts/PostFeed';
import PostCreator from '@/components/posts/PostCreator';

export default function VenuePostsPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const { user, userProfile } = useAuth();
  
  const [showPostCreator, setShowPostCreator] = useState(false);

  // Get venue data including posts from offline storage
  const { venueData, isLoading, error } = useOfflineVenueData(venueId);
  const posts = venueData?.posts || [];

  const canCreatePost = userProfile?.role === 'technical_volunteer' || userProfile?.role === 'admin';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C38]"></div>
      </div>
    );
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!user || !userProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to access posts.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Quick create post section */}
      {canCreatePost && (
        <div className="mb-6 bg-white rounded-lg border shadow-sm p-4">
          <button
            onClick={() => setShowPostCreator(true)}
            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-[#F28C38] hover:bg-orange-50 transition-colors"
          >
            <div className="flex items-center text-gray-500">
              <Plus className="h-5 w-5 mr-3 text-[#F28C38]" />
              <span>Share an update with the venue...</span>
            </div>
          </button>
        </div>
      )}

      <PostFeed entityType="fixture" entityId={venueId} />

      <PostCreator 
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        onPostCreated={() => setShowPostCreator(false)} 
      />
    </div>
  );
}
