'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Camera, Video, AlertCircle, CheckCircle, Newspaper, Users } from 'lucide-react';
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
  
  const [activeTab, setActiveTab] = useState('venue-media');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Get venue media and posts
  const { data: venueData, isLoading: venueLoading, error: venueError } = 
    api.volunteers.venue.getVenueMediaAndPosts.useQuery({ venueId });

  // Get public posts from other volunteers
  const { data: publicPosts, isLoading: publicLoading } = 
    api.volunteers.venue.getPublicPosts.useQuery({ limit: 20, offset: 0 });

  const canUploadMedia = userProfile?.role === 'technical_volunteer' || userProfile?.role === 'admin';

  if (venueLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading venue media...</p>
          </div>
        </div>
      </div>
    );
  }

  if (venueError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {venueError.message || 'Failed to load venue media'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to access venue media.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canUploadMedia) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Only technical volunteers can access venue media management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const tabs = [
    { id: 'venue-media', label: 'Venue Media', icon: Camera, count: venueData?.venueMedia?.length || 0 },
    { id: 'venue-posts', label: 'Venue Posts', icon: Newspaper, count: venueData?.posts?.length || 0 },
    { id: 'public-posts', label: 'Public Posts', icon: Users, count: publicPosts?.length || 0 },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venue Media Management</h1>
          <p className="text-gray-600 mt-1">Upload and manage media for your assigned venue</p>
        </div>
        
        {canUploadMedia && (
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Media
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'venue-media' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Venue Media</h2>
            </div>
            
            {venueData?.venueMedia && venueData.venueMedia.length > 0 ? (
              <MediaGrid media={venueData.venueMedia} />
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No media uploaded yet</h3>
                <p className="text-gray-600 mb-4">Start by uploading photos or videos of your venue</p>
                <Button onClick={() => setShowUploadModal(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First Media
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'venue-posts' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Venue Posts</h2>
            </div>
            
            {venueData?.posts && venueData.posts.length > 0 ? (
              <PostFeed posts={venueData.posts} />
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-600">Posts from fixtures and matches at this venue will appear here</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'public-posts' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Public Posts from Other Volunteers</h2>
            </div>
            
            {publicLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading public posts...</p>
              </div>
            ) : publicPosts && publicPosts.length > 0 ? (
              <PostFeed posts={publicPosts} />
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No public posts available</h3>
                <p className="text-gray-600">Public posts from other volunteers will appear here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <EnhancedModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Media"
        size="lg"
      >
        <MediaUpload
          venueId={venueId}
          onUploadComplete={() => {
            setShowUploadModal(false);
            // Refresh data
            window.location.reload();
          }}
          onCancel={() => setShowUploadModal(false)}
        />
      </EnhancedModal>
    </div>
  );
}
