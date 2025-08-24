'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/AdvancedTabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Camera, Video, AlertCircle, CheckCircle } from 'lucide-react';
import { MediaUpload } from '@/components/media/MediaUpload';
import { MediaGallery } from '@/components/media/MediaGallery';
import { MediaEditModal } from '@/components/media/MediaEditModal';
import { useMediaManager } from '@/hooks/media/useMediaManager';
import { useAuth } from '@/context/AuthContext';
import { MediaItem, MediaFilter } from '@/lib/types/media';

export default function VenueMediaPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const { user, userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState('upload');
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableFixtures, setAvailableFixtures] = useState<Array<{ id: string; name: string; }>>([]);
  const [availableMatches, setAvailableMatches] = useState<Array<{ id: string; name: string; }>>([]);
  
  const {
    state: mediaState,
    loadMedia,
    updateMediaItem,
    deleteMediaItem,
    clearError
  } = useMediaManager();

  // Load venue media on component mount
  useEffect(() => {
    if (venueId) {
      const filters: MediaFilter = {
        type: 'all',
        status: 'active'
      };
      loadMedia(filters);
    }
  }, [venueId, loadMedia]);

  // Load fixtures and matches for filtering
  useEffect(() => {
    const loadContextData = async () => {
      try {
        // For now, use placeholder data
        // In a real app, you would fetch this from your fixtures/matches API
        const fixtures = [
          { id: 'fixture1', name: 'Tournament A' },
          { id: 'fixture2', name: 'Tournament B' }
        ];
        const matches = [
          { id: 'match1', name: 'Match 1: Team A vs Team B' },
          { id: 'match2', name: 'Match 2: Team C vs Team D' }
        ];
        
        
        setAvailableFixtures(fixtures);
        setAvailableMatches(matches);
      } catch (error) {
        // Error handling removed
      }
    };

    if (venueId) {
      loadContextData();
    }
  }, [venueId]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleUploadComplete = (results: any[]) => {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      setSuccessMessage(
        `Successfully uploaded ${successCount} ${successCount === 1 ? 'file' : 'files'}` +
        (failCount > 0 ? ` (${failCount} failed)` : '')
      );
      setActiveTab('gallery');
      // Reload media to show new uploads
      loadMedia();
    }
  };

  const handleUploadError = (error: string) => {
    setErrorMessage(error);
  };

  const handleEditMedia = (mediaId: string) => {
    const mediaItem = mediaState.mediaItems.find(item => item.mediaId === mediaId);
    if (mediaItem) {
      setEditingMedia(mediaItem);
    }
  };

  const handleSaveMedia = async (mediaId: string, updates: Partial<MediaItem>): Promise<boolean> => {
    const success = await updateMediaItem(mediaId, updates);
    if (success) {
      setSuccessMessage('Media updated successfully');
    }
    return success;
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (window.confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
      const success = await deleteMediaItem(mediaId);
      if (success) {
        setSuccessMessage('Media deleted successfully');
      } else {
        setErrorMessage('Failed to delete media');
      }
    }
  };

  const handleDownloadMedia = (mediaItem: MediaItem) => {
    // Create a temporary link to download the media
    const link = document.createElement('a');
    link.href = mediaItem.url;
    link.download = mediaItem.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if user has permission to upload media
  const canUploadMedia = userProfile?.role === 'technical_volunteer' || userProfile?.role === 'admin';
  const canEditMedia = userProfile?.role === 'technical_volunteer' || userProfile?.role === 'admin';
  const canDeleteMedia = userProfile?.role === 'admin';

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
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Media Management</h1>
            <p className="text-sm md:text-base text-gray-600">
              Upload and manage photos and videos for this venue
            </p>
          </div>
          
          {/* Toggle Buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium
                ${activeTab === 'upload' 
                  ? 'bg-primary-500 text-white hover:bg-primary-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload Media</span>
              <span className="sm:hidden">Upload</span>
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium
                ${activeTab === 'gallery' 
                  ? 'bg-primary-500 text-white hover:bg-primary-600' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Media Gallery</span>
              <span className="sm:hidden">Gallery</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {(errorMessage || mediaState.error) && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessage || mediaState.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Content based on active tab */}
      <div className="space-y-6">
        {activeTab === 'upload' && (
          <div className="space-y-8">
            {!canUploadMedia ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You don&apos;t have permission to upload media. Only technical volunteers and admins can upload media.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-1">
                <div className="text-center mb-8">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Upload Your Media</h2>
                  <p className="text-sm md:text-base text-gray-600">Share photos and videos from your venue events</p>
                </div>
                <MediaUpload
                  venueId={venueId}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  multiple={true}
                  acceptedTypes="all"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'gallery' && (
          <div>
            {mediaState.loading && mediaState.mediaItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading media...</p>
              </div>
            ) : (
              <MediaGallery
                mediaItems={mediaState.mediaItems}
                onEdit={canEditMedia ? handleEditMedia : undefined}
                onDelete={canDeleteMedia ? handleDeleteMedia : undefined}
                onDownload={handleDownloadMedia}
                showActions={true}
                showFilters={true}
                availableFixtures={availableFixtures}
                availableMatches={availableMatches}
              />
            )}
            
            {/* Load More Button */}
            {mediaState.hasMore && !mediaState.loading && (
              <div className="text-center mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => {/* loadMoreMedia would be called here */}}
                >
                  Load More Media
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Media Modal */}
      <MediaEditModal
        mediaItem={editingMedia}
        isOpen={!!editingMedia}
        onClose={() => setEditingMedia(null)}
        onSave={handleSaveMedia}
        isAdmin={userProfile?.role === 'admin'}
      />
    </div>
  );
}
