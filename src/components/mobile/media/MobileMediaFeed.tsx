'use client';

import { useState } from 'react';
import { Image, Video, Heart, MessageCircle, Share, Camera, Upload } from 'lucide-react';
import { MobileCard } from '../ui/MobileCard';
import { MobileButton } from '../ui/MobileButton';
import { FloatingActionButton } from '../ui/FloatingActionButton';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  caption: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  uploader: {
    name: string;
    role: string;
  };
  createdAt: string;
}

// Mock data for now
const mockMediaItems: MediaItem[] = [
  {
    id: '1',
    type: 'image',
    url: '/images/placeholders/tournament-1.jpg',
    caption: 'Great match between Team A and Team B! 🏆',
    likes: 24,
    comments: 8,
    isLiked: false,
    uploader: {
      name: 'John Captain',
      role: 'captain'
    },
    createdAt: '2 hours ago'
  },
  {
    id: '2',
    type: 'video',
    url: '/videos/match-highlights.mp4',
    thumbnailUrl: '/images/placeholders/video-thumb.jpg',
    caption: 'Amazing goal in the final minutes! ⚽',
    likes: 45,
    comments: 12,
    isLiked: true,
    uploader: {
      name: 'Sarah Player',
      role: 'player'
    },
    createdAt: '4 hours ago'
  }
];

export function MobileMediaFeed() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(mockMediaItems);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');

  const handleLike = (itemId: string) => {
    setMediaItems(items =>
      items.map(item =>
        item.id === itemId
          ? {
              ...item,
              isLiked: !item.isLiked,
              likes: item.isLiked ? item.likes - 1 : item.likes + 1
            }
          : item
      )
    );
  };

  const handleUpload = () => {
    console.log('Open media upload');
    // TODO: Implement media upload
  };

  const filteredItems = mediaItems.filter(item => 
    filter === 'all' || item.type === filter
  );

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <MobileCard>
        <div className="flex space-x-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#2C5282] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Media
          </button>
          <button
            onClick={() => setFilter('image')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === 'image'
                ? 'bg-[#2C5282] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Image size={16} className="inline mr-1" />
            Photos
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              filter === 'video'
                ? 'bg-[#2C5282] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Video size={16} className="inline mr-1" />
            Videos
          </button>
        </div>
      </MobileCard>

      {/* Media Feed */}
      {filteredItems.length === 0 ? (
        <MobileCard>
          <div className="text-center py-8">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Media Yet</h3>
            <p className="text-gray-600 mb-4">
              Be the first to share photos and videos from your tournament experience!
            </p>
            <MobileButton
              variant="primary"
              onClick={handleUpload}
            >
              <Upload size={16} className="mr-2" />
              Upload Media
            </MobileButton>
          </div>
        </MobileCard>
      ) : (
        filteredItems.map((item) => (
          <MobileCard key={item.id}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                  <span className="text-xs font-medium text-gray-600">
                    {item.uploader.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.uploader.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{item.uploader.role} • {item.createdAt}</p>
                </div>
              </div>
              <div className="flex items-center">
                {item.type === 'image' ? (
                  <Image size={16} className="text-gray-400" />
                ) : (
                  <Video size={16} className="text-gray-400" />
                )}
              </div>
            </div>

            {/* Media Content */}
            <div className="mb-3">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.caption}
                  className="w-full h-64 object-cover rounded-lg bg-gray-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholders/image-placeholder.jpg';
                  }}
                />
              ) : (
                <div className="relative">
                  <img
                    src={item.thumbnailUrl || '/images/placeholders/video-placeholder.jpg'}
                    alt={item.caption}
                    className="w-full h-64 object-cover rounded-lg bg-gray-100"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <Video size={24} className="text-white ml-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Caption */}
            {item.caption && (
              <p className="text-gray-900 mb-3 text-sm">{item.caption}</p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleLike(item.id)}
                  className={`flex items-center space-x-1 ${
                    item.isLiked ? 'text-red-500' : 'text-gray-500'
                  } hover:text-red-500 transition-colors`}
                >
                  <Heart
                    size={18}
                    className={item.isLiked ? 'fill-current' : ''}
                  />
                  <span className="text-sm">{item.likes}</span>
                </button>

                <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors">
                  <MessageCircle size={18} />
                  <span className="text-sm">{item.comments}</span>
                </button>
              </div>

              <button className="text-gray-500 hover:text-gray-700 transition-colors">
                <Share size={18} />
              </button>
            </div>
          </MobileCard>
        ))
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        icon={<Camera size={24} />}
        onClick={handleUpload}
        visible={true}
      />
    </div>
  );
}
