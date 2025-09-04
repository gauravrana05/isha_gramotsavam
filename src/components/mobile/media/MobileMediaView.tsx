'use client';

import { Image, Video, Heart, MessageCircle, Eye, MapPin } from 'lucide-react';
import { MobileCard } from '../ui/MobileCard';
import { MediaItem } from './MediaItem';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';

export function MobileMediaView() {
  const { user } = useAuth();

  // Fetch venue media posted by volunteers
  const { data: mediaData, isLoading } = api.media.getVenueMediaFeed.useQuery(
    { venueId: user?.venueId || '' },
    { enabled: !!user?.venueId }
  );

  const handleFilterChange = (filter: 'all' | 'photos' | 'videos') => {
    console.log('Filter media by:', filter);
  };

  const handleLikeMedia = (mediaId: string) => {
    console.log('Like media:', mediaId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
          <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
          <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
          <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const photos = mediaData?.filter(item => item.type === 'image') || [];
  const videos = mediaData?.filter(item => item.type === 'video') || [];

  return (
    <div className="space-y-4">
      {/* Venue Media Stats */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="mobile-card-title">Venue Highlights</h3>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin size={16} className="mr-1" />
            Your Venue
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Image size={24} className="text-blue-600" />
            </div>
            <p className="text-lg font-bold text-blue-600">{photos.length}</p>
            <p className="text-xs text-gray-600">Photos</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Video size={24} className="text-purple-600" />
            </div>
            <p className="text-lg font-bold text-purple-600">{videos.length}</p>
            <p className="text-xs text-gray-600">Videos</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Heart size={24} className="text-red-600" />
            </div>
            <p className="text-lg font-bold text-red-600">
              {mediaData?.reduce((sum, item) => sum + (item.likes || 0), 0) || 0}
            </p>
            <p className="text-xs text-gray-600">Total Likes</p>
          </div>
        </div>
      </MobileCard>

      {/* Filter Tabs */}
      <MobileCard padding="sm">
        <div className="flex space-x-1">
          <button
            onClick={() => handleFilterChange('all')}
            className="flex-1 py-2 px-3 bg-[#2C5282] text-white rounded-lg text-sm font-medium"
          >
            All ({mediaData?.length || 0})
          </button>
          <button
            onClick={() => handleFilterChange('photos')}
            className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
          >
            Photos ({photos.length})
          </button>
          <button
            onClick={() => handleFilterChange('videos')}
            className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
          >
            Videos ({videos.length})
          </button>
        </div>
      </MobileCard>

      {/* Media Grid */}
      {mediaData && mediaData.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {mediaData.map((item: any) => (
            <MediaItem
              key={item.id}
              mediaItem={item}
              onClick={() => console.log('View media:', item.id)}
              onLike={() => handleLikeMedia(item.id)}
            />
          ))}
        </div>
      ) : (
        <MobileCard>
          <div className="text-center py-8">
            <Eye size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="mobile-card-title mb-2">No Media Yet</h3>
            <p className="text-gray-600">Volunteers haven't posted any photos or videos from your venue yet</p>
            <p className="text-sm text-gray-500 mt-2">Check back later for tournament highlights!</p>
          </div>
        </MobileCard>
      )}

      {/* Recent Posts */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Recent Posts</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <Image size={16} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm">Match highlights uploaded</p>
              <p className="text-xs text-gray-500">By Tournament Volunteer • 2 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <Video size={16} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm">Victory celebration video</p>
              <p className="text-xs text-gray-500">By Media Team • 4 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <Image size={16} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm">Team group photos</p>
              <p className="text-xs text-gray-500">By Venue Coordinator • 6 hours ago</p>
            </div>
          </div>
        </div>
      </MobileCard>

      {/* Media Guidelines */}
      <MobileCard>
        <h3 className="mobile-card-title mb-2">About Venue Media</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Photos and videos are posted by tournament volunteers</p>
          <p>• Content includes match highlights, team celebrations, and venue moments</p>
          <p>• Like and share your favorite memories</p>
          <p>• All media follows tournament guidelines and privacy policies</p>
        </div>
      </MobileCard>
    </div>
  );
}
