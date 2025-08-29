'use client';

import React, { useState, useMemo } from 'react';
import { Filter, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { MediaFullPreview } from './MediaFullPreview';
import { MediaItem } from '@/lib/types/media';
import { MediaDisplay } from './MediaDisplay';
import { MediaFilterSidebar, MediaFilterState } from './MediaFilterSidebar';

interface MediaGalleryProps {
  mediaItems: MediaItem[];
  onEdit?: (mediaId: string) => void;
  onDelete?: (mediaId: string) => void;
  onDownload?: (mediaItem: MediaItem) => void;
  showActions?: boolean;
  showFilters?: boolean;
  availableFixtures?: Array<{ id: string; name: string; }>;
  availableMatches?: Array<{ id: string; name: string; }>;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  mediaItems,
  onEdit,
  onDelete,
  onDownload,
  showActions = true,
  showFilters = true,
  availableFixtures = [],
  availableMatches = []
}) => {
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(null);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  
  const [filters, setFilters] = useState<MediaFilterState>({
    search: '',
    type: 'all',
    capturedDuring: 'all',
    context: 'all',
    tags: []
  });

  // Get available filter options from data
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    mediaItems.forEach(item => {
      item.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [mediaItems]);

  // Filter media items
  const filteredMediaItems = useMemo(() => {
    return mediaItems.filter(item => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          item.title.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filters.type !== 'all' && item.type !== filters.type) {
        return false;
      }

      // Captured during filter
      if (filters.capturedDuring !== 'all' && item.capturedDuring !== filters.capturedDuring) {
        return false;
      }

      // Context filter
      if (filters.context !== 'all') {
        if (filters.context === 'tournament') {
          if (!item.fixtureId) return false;
          if (filters.fixtureId && filters.fixtureId !== 'all-tournaments' && item.fixtureId !== filters.fixtureId) return false;
        } else if (filters.context === 'match') {
          if (!item.matchId) return false;
          if (filters.matchId && filters.matchId !== 'all-matches' && item.matchId !== filters.matchId) return false;
        } else if (filters.context === 'venue') {
          if (item.fixtureId || item.matchId) return false;
        }
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag => 
          item.tags?.some(itemTag => itemTag.toLowerCase().includes(filterTag.toLowerCase()))
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [mediaItems, filters]);

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Unknown';
    
    let date: Date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      capturedDuring: 'all',
      context: 'all',
      tags: []
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.type !== 'all') count++;
    if (filters.capturedDuring !== 'all') count++;
    if (filters.context !== 'all') count++;
    if (filters.fixtureId && filters.fixtureId !== 'all-tournaments') count++;
    if (filters.matchId && filters.matchId !== 'all-matches') count++;
    if (filters.tags.length > 0) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      {showFilters && (
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search media by title, description, or tags..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Filter Button */}
          <Button
            variant="primary"
            onClick={() => setIsFilterSidebarOpen(true)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {getActiveFilterCount()}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Active Filters Display */}
      {getActiveFilterCount() > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {filters.type !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Type: {filters.type}
            </Badge>
          )}
          {filters.capturedDuring !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Captured: {filters.capturedDuring}
            </Badge>
          )}
          {filters.context !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Context: {filters.context}
            </Badge>
          )}
          {filters.fixtureId && filters.fixtureId !== 'all-tournaments' && (
            <Badge variant="secondary" className="text-xs">
              Tournament: {availableFixtures.find(f => f.id === filters.fixtureId)?.name || filters.fixtureId}
            </Badge>
          )}
          {filters.matchId && filters.matchId !== 'all-matches' && (
            <Badge variant="secondary" className="text-xs">
              Match: {availableMatches.find(m => m.id === filters.matchId)?.name || filters.matchId}
            </Badge>
          )}
          {filters.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              Tag: {tag}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <p className="text-sm text-gray-600">
          Showing {filteredMediaItems.length} of {mediaItems.length} media items
        </p>
        {filteredMediaItems.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredMediaItems.filter(item => item.type === 'image').length} Images
            </Badge>
            <Badge variant="outline" className="text-xs">
              {filteredMediaItems.filter(item => item.type === 'video').length} Videos
            </Badge>
          </div>
        )}
      </div>

      {/* Media Grid */}
      {filteredMediaItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Filter className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No media found</h3>
          <p className="text-gray-500 mb-4">
            {getActiveFilterCount() > 0
              ? 'Try adjusting your filters or search terms'
              : 'Upload some media to get started'
            }
          </p>
          {getActiveFilterCount() > 0 && (
            <Button variant="outline" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {filteredMediaItems.map((item) => (
            <MediaDisplay
              key={item.mediaId}
              item={item}
              onClick={() => setSelectedMediaItem(item)}
              onEdit={onEdit}
              onDelete={onDelete}
              onDownload={onDownload}
              showActions={showActions}
              showTitle={true}
              size="medium"
              aspectRatio="square"
            />
          ))}
        </div>
      )}

      {/* Filter Sidebar */}
      <MediaFilterSidebar
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onClearAll={clearAllFilters}
        availableTags={availableTags}
        availableFixtures={availableFixtures}
        availableMatches={availableMatches}
      />

      {/* Full Screen Media Preview */}
      <MediaFullPreview
        mediaItem={selectedMediaItem}
        isOpen={!!selectedMediaItem}
        onClose={() => setSelectedMediaItem(null)}
        onEdit={onEdit}
        onDelete={onDelete}
        onDownload={onDownload}
        showActions={showActions}
      />
    </div>
  );
};