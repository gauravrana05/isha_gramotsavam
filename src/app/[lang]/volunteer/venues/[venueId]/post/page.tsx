'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import PostFeed from '@/components/posts/PostFeed';
import PostCreator from '@/components/posts/PostCreator';

export default function VenuePostsPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const { user, userProfile } = useAuth();
  
  const [showPostCreator, setShowPostCreator] = useState(false);

  const { data: posts, isLoading, error } = api.volunteers.venue.getVenuePosts.useQuery({ venueId });

  const canCreatePost = userProfile?.role === 'technical_volunteer' || userProfile?.role === 'admin';

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
            Please log in to access posts.
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
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Venue Posts</h1>
            <p className="text-sm md:text-base text-gray-600">
              Updates and announcements from this venue
            </p>
          </div>
          
          {canCreatePost && (
            <Button onClick={() => setShowPostCreator(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          )}
        </div>
      </div>

      <PostFeed entityType="fixture" entityId={venueId} />

      <EnhancedModal
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        title="Create a New Post"
        size="2xl"
      >
        <PostCreator onPostCreated={() => setShowPostCreator(false)} />
      </EnhancedModal>
    </div>
  );
}
