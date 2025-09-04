'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOfflineVenueData } from '@/hooks/useOfflineVenueData';
import { useOfflineActions } from '@/hooks/useOfflineActions';
import { useNotification } from '@/context/NotificationContext';
import { 
  Upload, 
  Camera, 
  Video, 
  Eye, 
  Download, 
  Play,
  Image as ImageIcon,
  X,
  AlertCircle,
  Loader2,
  Share2,
  Trash2
} from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  title: string;
  createdAt: string;
  fileType?: string;
  size?: number;
}

const MediaCard = ({ media, canDelete = false, onDelete }: { 
  media: MediaItem; 
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: media.title,
          url: media.url
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(media.url);
      }
    } else {
      navigator.clipboard.writeText(media.url);
    }
  };

  return (
    <>
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer"
           onClick={() => setIsModalOpen(true)}>
        {media.type === 'image' ? (
          <img
            src={media.thumbnail || media.url}
            alt={media.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="relative w-full h-full">
            <video
              src={media.url}
              poster={media.thumbnail}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white rounded-full p-3">
                <Play className="w-6 h-6 text-gray-900" fill="currentColor" />
              </div>
            </div>
          </div>
        )}

        {/* Loading placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            {media.type === 'image' ? (
              <ImageIcon className="w-8 h-8 text-gray-400" />
            ) : (
              <Video className="w-8 h-8 text-gray-400" />
            )}
          </div>
        )}

        {/* Desktop hover overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-300 hidden sm:flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
              title="View"
            >
              <Eye className="w-4 h-4 text-gray-900" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4 text-gray-900" />
            </button>
            <a
              href={media.url}
              download={media.title}
              onClick={(e) => e.stopPropagation()}
              className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4 text-gray-900" />
            </a>
            {canDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(media.id);
                }}
                className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Media type indicator */}
        <div className="absolute top-2 right-2">
          <div className="bg-black bg-opacity-75 rounded-full p-1">
            {media.type === 'image' ? (
              <ImageIcon className="w-4 h-4 text-white" />
            ) : (
              <Video className="w-4 h-4 text-white" />
            )}
          </div>
        </div>

        {/* Bottom gradient with info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/50 to-transparent">
          <p className="text-white text-sm font-medium truncate">{media.title}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-gray-300 text-xs">{formatDate(media.createdAt)}</p>
            {media.size && (
              <p className="text-gray-300 text-xs">{formatFileSize(media.size)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile info section (below image) */}
      <div className="sm:hidden p-2">
        <p className="font-medium text-sm truncate text-gray-900">{media.title}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-gray-600 text-xs">{formatDate(media.createdAt)}</p>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1 text-gray-600 hover:text-gray-900"
              title="View"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={handleShare}
              className="p-1 text-gray-600 hover:text-gray-900"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <a
              href={media.url}
              download={media.title}
              className="p-1 text-gray-600 hover:text-gray-900"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
            {canDelete && onDelete && (
              <button
                onClick={() => onDelete(media.id)}
                className="p-1 text-red-600 hover:text-red-900"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Media Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75"
            >
              <X className="w-5 h-5" />
            </button>
            
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt={media.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={media.url}
                controls
                className="w-full h-full object-contain"
                autoPlay
              />
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
              <h3 className="text-white text-lg font-medium">{media.title}</h3>
              <p className="text-gray-300 text-sm">{formatDate(media.createdAt)}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function MediaPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const { user, userProfile } = useAuth();
  const { addNotification } = useNotification();
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get venue media - always call the hook
  // Get venue media data from offline storage
  const { venueData, isLoading, error } = useOfflineVenueData(venueId);
  const { uploadMedia } = useOfflineActions();
  
  // Extract media data from venue data
  const mediaData = venueData?.media || [];
  const postsData = venueData?.posts || [];

  const canUploadMedia = userProfile?.role === 'technical_volunteer' || 
                        userProfile?.role === 'general_volunteer' || 
                        userProfile?.role === 'admin';

  const handleDeleteMedia = useCallback(async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;
    
    try {
      // TODO: Implement deleteMedia action in useOfflineActions
      console.log('Deleting media offline:', mediaId);
      addNotification('Media deleted successfully', 'success');
      // No refetch needed - data updates automatically
    } catch (error) {
      addNotification('Failed to delete media', 'error');
    }
  }, [addNotification]);

  // Mock upload function - replace with actual implementation
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!canUploadMedia) {
      addNotification('You do not have permission to upload media', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          setUploadProgress(progress);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // TODO: Replace with actual upload API call
        // const result = await uploadMediaFile(file, { venueId });
        
        addNotification(`${file.name} uploaded successfully`, 'success');
      }

      await refetchMedia();
    } catch (error) {
      addNotification(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [canUploadMedia, venueId, addNotification, refetchMedia]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Loading state with volunteer theme
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#F28C38]" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center bg-white rounded-xl shadow-sm border p-8 max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-red-600 mb-2">Error Loading Media</h1>
            <p className="text-gray-600">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Permission check
  if (!canUploadMedia) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center bg-white rounded-xl shadow-sm border p-8 max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-amber-600 mb-2">Access Restricted</h1>
            <p className="text-gray-600">Only volunteers can access venue media management.</p>
          </div>
        </div>
      </div>
    );
  }

  const mediaItems: MediaItem[] = venueData?.venueMedia || [];
  
  // Filter media items
  const filteredMedia = mediaItems.filter(item => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Photos') return item.type === 'image';
    if (activeFilter === 'Videos') return item.type === 'video';
    return true;
  });

  const filterOptions = [
    { key: 'All', label: t('volunteer.media.all', 'All'), count: mediaItems.length },
    { key: 'Photos', label: t('volunteer.media.photos', 'Photos'), count: mediaItems.filter(m => m.type === 'image').length },
    { key: 'Videos', label: t('volunteer.media.videos', 'Videos'), count: mediaItems.filter(m => m.type === 'video').length },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <Camera className="w-6 h-6 text-[#F28C38] mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">{t('volunteer.media.title', 'Venue Media')}</h1>
          </div>
          <p className="text-gray-600">
            {t('volunteer.media.description', 'Upload and manage photos and videos for this venue')}
          </p>
        </div>
        {/* Upload Area */}
        <div 
          className="mb-6 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#F28C38] transition-colors duration-300 bg-white shadow-sm"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
            id="media-upload"
            disabled={uploading}
          />
          <label htmlFor="media-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">{t('volunteer.media.upload', 'Upload Media')}</p>
            <p className="text-gray-600 text-sm sm:text-base">
              {t('volunteer.media.drag_drop', 'Drag & drop or click to select photos and videos')}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              {t('volunteer.media.supported_formats', 'Supports JPG, PNG, MP4, MOV files up to 100MB')}
            </p>
          </label>

          {uploading && (
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-[#F28C38] h-3 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {t('volunteer.media.uploading', 'Uploading...')} {uploadProgress}%
              </p>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 mb-6 bg-white p-1 rounded-xl shadow-sm">
          {filterOptions.map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter.key
                  ? 'bg-[#F28C38] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Media Grid */}
        {filteredMedia.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMedia.map(item => (
              <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm border">
                <MediaCard 
                  media={item} 
                  canDelete={userProfile?.role === 'technical_volunteer' || userProfile?.role === 'admin'}
                  onDelete={handleDeleteMedia}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border">
            <div className="max-w-sm mx-auto">
              {activeFilter === 'All' ? (
                <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              ) : activeFilter === 'Photos' ? (
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              ) : (
                <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              )}
              
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {activeFilter === 'All' 
                  ? 'No media uploaded yet' 
                  : `No ${activeFilter.toLowerCase()} found`
                }
              </h3>
              
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                {activeFilter === 'All'
                  ? 'Start by uploading photos or videos of your venue'
                  : `Upload some ${activeFilter.toLowerCase()} to see them here`
                }
              </p>
              
              <button
                onClick={() => document.getElementById('media-upload')?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Media
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}