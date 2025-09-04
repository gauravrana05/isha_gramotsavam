'use client';

import { Play, Heart, MessageCircle, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/component-patterns';

interface MediaItemProps {
  mediaItem: any;
  onClick: () => void;
  onLike?: () => void;
}

export function MediaItem({ mediaItem, onClick, onLike }: MediaItemProps) {
  const isVideo = mediaItem.type === 'video';

  return (
    <div
      onClick={onClick}
      className="relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow aspect-square"
    >
      {/* Media Content */}
      <div className="w-full h-full">
        {mediaItem.thumbnailUrl || mediaItem.url ? (
          <img
            src={mediaItem.thumbnailUrl || mediaItem.url}
            alt={mediaItem.caption || 'Venue media'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-xs">No preview</span>
          </div>
        )}
      </div>

      {/* Video Play Button */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
            <Play size={20} className="text-white ml-1" />
          </div>
        </div>
      )}

      {/* Media Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        {/* Caption */}
        {mediaItem.caption && (
          <p className="text-white text-xs mb-1 line-clamp-2">
            {mediaItem.caption}
          </p>
        )}

        {/* Stats and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Like Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike?.();
              }}
              className="flex items-center hover:scale-110 transition-transform"
            >
              <Heart 
                size={12} 
                className={cn(
                  "mr-1",
                  mediaItem.isLiked ? "text-red-400 fill-current" : "text-white"
                )} 
              />
              <span className="text-white text-xs">{mediaItem.likes || 0}</span>
            </button>
            
            {mediaItem.comments > 0 && (
              <div className="flex items-center">
                <MessageCircle size={12} className="text-blue-400 mr-1" />
                <span className="text-white text-xs">{mediaItem.comments}</span>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center">
            <Clock size={10} className="text-gray-300 mr-1" />
            <span className="text-gray-300 text-xs">
              {new Date(mediaItem.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Posted by Volunteer Badge */}
      <div className="absolute top-2 left-2">
        <div className="flex items-center px-2 py-1 bg-green-500 text-white rounded text-xs font-medium">
          <Shield size={10} className="mr-1" />
          Volunteer
        </div>
      </div>

      {/* Type Badge */}
      <div className="absolute top-2 right-2">
        <div className={cn(
          'px-2 py-1 rounded text-xs font-medium',
          isVideo 
            ? 'bg-purple-500 text-white' 
            : 'bg-blue-500 text-white'
        )}>
          {isVideo ? 'Video' : 'Photo'}
        </div>
      </div>
    </div>
  );
}
