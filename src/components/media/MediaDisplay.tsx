'use client';

import React from 'react';
import { Download, Edit, Trash2, Image, Video, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { MediaItem } from '@/lib/types/media';

interface MediaDisplayProps {
  item: MediaItem;
  onClick?: () => void;
  onEdit?: (mediaId: string) => void;
  onDelete?: (mediaId: string) => void;
  onDownload?: (mediaItem: MediaItem) => void;
  showActions?: boolean;
  size?: 'small' | 'medium' | 'large';
  aspectRatio?: 'square' | 'video' | 'auto';
}

export const MediaDisplay: React.FC<MediaDisplayProps> = ({
  item,
  onClick,
  onEdit,
  onDelete,
  onDownload,
  showActions = true,
  size = 'medium',
  aspectRatio = 'auto'
}) => {
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'rounded-lg',
          aspect: aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'video' ? 'aspect-video' : 'aspect-square md:aspect-video',
          badge: 'top-1 left-1',
          badgeSize: 'text-xs',
          iconSize: 'h-2 w-2',
          actions: 'top-1 right-1',
          actionButton: 'h-6 w-6 p-0',
          actionIcon: 'h-3 w-3',
          videoIcon: 'h-6 w-6',
          eyeIcon: 'h-4 w-4',
          eyeContainer: 'p-2',
          duration: 'bottom-1 right-1 text-xs px-1 py-0.5'
        };
      case 'large':
        return {
          container: 'rounded-xl',
          aspect: aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'video' ? 'aspect-video' : 'aspect-video',
          badge: 'top-3 left-3',
          badgeSize: 'text-sm',
          iconSize: 'h-4 w-4',
          actions: 'top-3 right-3',
          actionButton: 'h-10 w-10 p-0',
          actionIcon: 'h-5 w-5',
          videoIcon: 'h-16 w-16',
          eyeIcon: 'h-8 w-8',
          eyeContainer: 'p-4',
          duration: 'bottom-3 right-3 text-sm px-3 py-1'
        };
      default: // medium
        return {
          container: 'rounded-lg',
          aspect: aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'video' ? 'aspect-video' : 'aspect-square md:aspect-video',
          badge: 'top-2 left-2',
          badgeSize: 'text-xs',
          iconSize: 'h-3 w-3',
          actions: 'top-2 right-2',
          actionButton: 'h-8 w-8 p-0',
          actionIcon: 'h-4 w-4',
          videoIcon: 'h-10 w-10 md:h-12 md:w-12',
          eyeIcon: 'h-5 w-5 md:h-6 md:w-6',
          eyeContainer: 'p-2 md:p-3',
          duration: 'bottom-2 right-2 text-xs px-2 py-1'
        };
    }
  };

  const classes = getSizeClasses();

  return (
    <div 
      className={`relative group cursor-pointer ${classes.container} overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200`}
      onClick={onClick}
    >
      {item.type === 'image' ? (
        <div className={`${classes.aspect} bg-gray-100 overflow-hidden`}>
          <img
            src={item.url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        </div>
      ) : (
        <div className={`${classes.aspect} bg-gray-900 overflow-hidden relative`}>
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gray-800">
              <Video className={`${classes.videoIcon} text-gray-400`} />
            </div>
          )}
          
          {/* Play overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className={`bg-white bg-opacity-20 backdrop-blur-sm rounded-full ${classes.eyeContainer}`}>
              <Eye className={`${classes.eyeIcon} text-white`} />
            </div>
          </div>
          
          {/* Duration badge */}
          {item.duration && (
            <div className={`absolute ${classes.duration} bg-black bg-opacity-75 text-white rounded font-medium`}>
              {formatDuration(item.duration)}
            </div>
          )}
        </div>
      )}
      
      {/* Type badge */}
      <div className={`absolute ${classes.badge} z-10`}>
        <Badge 
          variant={item.type === 'image' ? 'default' : 'secondary'} 
          className={`${classes.badgeSize} bg-white/90 backdrop-blur-sm border-0 shadow-sm`}
        >
          {item.type === 'image' ? (
            <Image className={`${classes.iconSize} mr-1`} />
          ) : (
            <Video className={`${classes.iconSize} mr-1`} />
          )}
          <span className="hidden md:inline">
            {item.type.toUpperCase()}
          </span>
        </Badge>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className={`absolute ${classes.actions} z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
          <div className="flex gap-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
            {onDownload && (
              <Button
                size="sm"
                variant="secondary"
                className={`${classes.actionButton} bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 shadow-sm border-0`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(item);
                }}
              >
                <Download className={classes.actionIcon} />
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                variant="secondary"
                className={`${classes.actionButton} bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 shadow-sm border-0`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item.mediaId);
                }}
              >
                <Edit className={classes.actionIcon} />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="destructive"
                className={`${classes.actionButton} bg-red-500/90 hover:bg-red-600 text-white shadow-sm border-0`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.mediaId);
                }}
              >
                <Trash2 className={classes.actionIcon} />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};