'use client';

import Image from 'next/image';

import React from 'react';
import { X, Download, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MediaItem } from '@/lib/types/media';

interface MediaFullPreviewProps {
  mediaItem: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (mediaId: string) => void;
  onDelete?: (mediaId: string) => void;
  onDownload?: (mediaItem: MediaItem) => void;
  showActions?: boolean;
}

export const MediaFullPreview: React.FC<MediaFullPreviewProps> = ({
  mediaItem,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDownload,
  showActions = true
}) => {
  if (!isOpen || !mediaItem) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-[95vw] max-h-[95vh] w-full h-full flex items-center justify-center p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/20 rounded-full p-2 backdrop-blur-sm"
        >
          <X width={64} height={64} className="w-6 h-6" />
        </button>

        {/* Media content */}
        <div className="flex items-center justify-center w-full h-full">
          {mediaItem.type === 'image' ? (
            <Image
              src={mediaItem.url}
              alt={mediaItem.title}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={mediaItem.url}
              controls
              autoPlay
              className="max-w-full max-h-full"
              poster={mediaItem.thumbnailUrl}
              onClick={(e) => e.stopPropagation()}
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>

        {/* Media info overlay */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate" title={mediaItem.title}>
                {mediaItem.title}
              </h3>
              {mediaItem.description && (
                <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                  {mediaItem.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>{mediaItem.type.toUpperCase()}</span>
                <span>{Math.round(mediaItem.fileSize / 1024)} KB</span>
                <span>By {mediaItem.uploadedByName}</span>
              </div>
            </div>

            {/* Action buttons */}
            {showActions && (
              <div className="flex gap-2">
                {onDownload && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(mediaItem);
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(mediaItem.mediaId);
                      onClose();
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(mediaItem.mediaId);
                      onClose();
                    }}
                    className="bg-red-600/80 hover:bg-red-600 text-white border-red-500/20"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};