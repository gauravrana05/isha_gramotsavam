'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Camera, 
  Video, 
  Eye, 
  EyeOff, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Filter,
  Download,
  BarChart3
} from 'lucide-react';
import { MediaGallery } from '@/components/media/MediaGallery';
import { MediaEditModal } from '@/components/media/MediaEditModal';
import { useMediaManager } from '@/hooks/media/useMediaManager';
import { useAuth } from '@/context/AuthContext';
import { MediaItem, MediaFilter } from '@/lib/types/media';

export default function AdminMediaPage() {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [uploaderFilter, setUploaderFilter] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const {
    state: mediaState,
    loadMedia,
    updateMediaItem,
    deleteMediaItem,
    clearError
  } = useMediaManager();

  // Filter media items based on current filters
  const filteredMediaItems = React.useMemo(() => {
    let items = mediaState.mediaItems;

    // Filter by tab (status)
    if (activeTab !== 'all') {
      items = items.filter(item => item.status === activeTab);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.uploadedByName.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      items = items.filter(item => item.type === typeFilter);
    }

    // Filter by uploader
    if (uploaderFilter) {
      const uploader = uploaderFilter.toLowerCase();
      items = items.filter(item => 
        item.uploadedByName.toLowerCase().includes(uploader)
      );
    }

    return items;
  }, [mediaState.mediaItems, activeTab, searchQuery, typeFilter, uploaderFilter]);

  // Load all media (including all statuses) for admin oversight
  useEffect(() => {
    const filters: MediaFilter = {
      type: 'all'
      // Don't filter by status - load all media for admin review
    };
    loadMedia(filters, 50); // Load more items for admin view
  }, [loadMedia]);

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

  // Calculate statistics
  const statistics = React.useMemo(() => {
    const total = mediaState.mediaItems.length;
    const active = mediaState.mediaItems.filter(item => item.status === 'active').length;
    const pending = mediaState.mediaItems.filter(item => item.status === 'pending').length;
    const hidden = mediaState.mediaItems.filter(item => item.status === 'hidden').length;
    const deleted = mediaState.mediaItems.filter(item => item.status === 'deleted').length;
    const images = mediaState.mediaItems.filter(item => item.type === 'image').length;
    const videos = mediaState.mediaItems.filter(item => item.type === 'video').length;

    return { total, active, pending, hidden, deleted, images, videos };
  }, [mediaState.mediaItems]);

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
    if (window.confirm('Are you sure you want to permanently delete this media? This action cannot be undone.')) {
      const success = await deleteMediaItem(mediaId);
      if (success) {
        setSuccessMessage('Media deleted permanently');
      } else {
        setErrorMessage('Failed to delete media');
      }
    }
  };

  const handleDownloadMedia = (mediaItem: MediaItem) => {
    const link = document.createElement('a');
    link.href = mediaItem.url;
    link.download = mediaItem.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkAction = async (action: 'approve' | 'hide' | 'delete', mediaIds: string[]) => {
    // This would be implemented for bulk operations
    console.log(`Bulk ${action} for:`, mediaIds);
  };

  // Check if user is admin
  if (!user || !userProfile || userProfile.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only administrators can access media oversight.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Media Oversight</h1>
        <p className="text-gray-600">
          Monitor and moderate media uploads across all venues
        </p>
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
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessage || mediaState.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
            <div className="text-sm text-gray-500">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{statistics.hidden}</div>
            <div className="text-sm text-gray-500">Hidden</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{statistics.deleted}</div>
            <div className="text-sm text-gray-500">Deleted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{statistics.images}</div>
            <div className="text-sm text-gray-500">Images</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{statistics.videos}</div>
            <div className="text-sm text-gray-500">Videos</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                placeholder="Filter by uploader..."
                value={uploaderFilter}
                onChange={(e) => setUploaderFilter(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setUploaderFilter('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs by Status */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            All ({statistics.total})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Active ({statistics.active})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({statistics.pending})
          </TabsTrigger>
          <TabsTrigger value="hidden" className="flex items-center gap-2">
            <EyeOff className="h-4 w-4" />
            Hidden ({statistics.hidden})
          </TabsTrigger>
          <TabsTrigger value="deleted" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Deleted ({statistics.deleted})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Media Items
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Showing {filteredMediaItems.length} of {mediaState.totalCount} items</span>
                  {mediaState.loading && <span>Loading...</span>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mediaState.loading && mediaState.mediaItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading media...</p>
                </div>
              ) : filteredMediaItems.length === 0 ? (
                <div className="text-center py-12">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No media items found matching your filters</p>
                </div>
              ) : (
                <>
                  <MediaGallery
                    mediaItems={filteredMediaItems}
                    onEdit={handleEditMedia}
                    onDelete={handleDeleteMedia}
                    onDownload={handleDownloadMedia}
                    showActions={true}
                    showFilters={false} // We have our own filters above
                  />
                  
                  {/* Enhanced media list for admin with additional details */}
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Detailed View</h3>
                    <div className="space-y-3">
                      {filteredMediaItems.slice(0, 10).map((item) => (
                        <div key={item.mediaId} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {item.type === 'image' ? (
                                <Camera className="h-5 w-5 text-blue-500" />
                              ) : (
                                <Video className="h-5 w-5 text-green-500" />
                              )}
                              <div>
                                <h4 className="font-medium">{item.title}</h4>
                                <p className="text-sm text-gray-500">
                                  by {item.uploadedByName} • {new Date(item.uploadedAt?.seconds * 1000 || item.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  item.status === 'active' ? 'default' :
                                  item.status === 'pending' ? 'secondary' :
                                  item.status === 'hidden' ? 'outline' : 'destructive'
                                }
                              >
                                {item.status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditMedia(item.mediaId)}
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                          )}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Media Modal with Admin Features */}
      <MediaEditModal
        mediaItem={editingMedia}
        isOpen={!!editingMedia}
        onClose={() => setEditingMedia(null)}
        onSave={handleSaveMedia}
        isAdmin={true}
      />
    </div>
  );
}
