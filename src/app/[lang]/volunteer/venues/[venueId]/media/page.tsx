'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Camera, Video, AlertCircle, CheckCircle, Newspaper } from 'lucide-react';
import { MediaUpload } from '@/components/media/MediaUpload';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import MediaGrid from '@/components/media/MediaGrid';
import PostFeed from '@/components/posts/PostFeed';

export default function VenueMediaPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const { user, userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState('all-media');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { data, isLoading, error } = api.volunteers.venue.getVenueMediaAndPosts.useQuery({ venueId });

  const canUploadMedia = userProfile?.role === 'technical_volunteer' || userProfile?.role === 'admin';

  if (isLoading) {
    return <div>Loading...</div>;
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
            Please log in to access media management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Venue Media</h1>
            <p className="text-sm md:text-base text-gray-600">
              Photos, videos, and posts from this venue
            </p>
          </div>
          
          {canUploadMedia && (
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Media
            </Button>
          )}
        </div>
      </div>

      <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
        <button
          onClick={() => setActiveTab('all-media')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium
            ${activeTab === 'all-media' 
              ? 'bg-primary-500 text-white hover:bg-primary-600' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <Camera className="h-4 w-4" />
          All Media
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium
            ${activeTab === 'posts' 
              ? 'bg-primary-500 text-white hover:bg-primary-600' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <Newspaper className="h-4 w-4" />
          Posts
        </button>
      </div>

      <div>
        {activeTab === 'all-media' && (
          <MediaGrid mediaItems={data?.venueMedia || []} />
        )}
        {activeTab === 'posts' && (
          <PostFeed entityType="fixture" entityId={venueId} />
        )}
      </div>

      <EnhancedModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Media"
        size="2xl"
      >
        <MediaUpload
          venueId={venueId}
          onUploadComplete={() => {
            setShowUploadModal(false);
            // TODO: Invalidate and refetch data
          }}
        />
      </EnhancedModal>
    </div>
  );
}
