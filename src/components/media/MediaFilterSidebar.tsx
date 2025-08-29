'use client';

import React, { useState } from 'react';
import { X, Filter, Search, Calendar, User, Tag, MapPin, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Badge } from '@/components/ui/badge';

export interface MediaFilterState {
  search: string;
  type: 'all' | 'image' | 'video';
  capturedDuring: string;
  context: 'all' | 'tournament' | 'match' | 'venue';
  fixtureId?: string;
  matchId?: string;
  tags: string[];
}

interface MediaFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: MediaFilterState;
  onFiltersChange: (filters: MediaFilterState) => void;
  onClearAll: () => void;
  availableTags?: string[];
  availableFixtures?: Array<{ id: string; name: string; }>;
  availableMatches?: Array<{ id: string; name: string; }>;
}

export const MediaFilterSidebar: React.FC<MediaFilterSidebarProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearAll,
  availableTags = [],
  availableFixtures = [],
  availableMatches = []
}) => {
  const [tagInput, setTagInput] = useState('');

  const updateFilter = (key: keyof MediaFilterState, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value
    };
    
    // Clear specific tournament/match when context changes
    if (key === 'context') {
      if (value !== 'tournament') {
        newFilters.fixtureId = undefined;
      }
      if (value !== 'match') {
        newFilters.matchId = undefined;
      }
    }
    
    onFiltersChange(newFilters);
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !filters.tags.includes(tag.trim())) {
      updateFilter('tags', [...filters.tags, tag.trim()]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    updateFilter('tags', filters.tags.filter(t => t !== tag));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.capturedDuring !== 'all') count++;
    if (filters.context !== 'all') count++;
    if (filters.fixtureId && filters.fixtureId !== 'all-tournaments') count++;
    if (filters.matchId && filters.matchId !== 'all-matches') count++;
    if (filters.tags.length > 0) count++;
    return count;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - only on mobile */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:shadow-xl lg:border-l lg:border-gray-200
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Filters</h3>
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Media Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Image className="h-4 w-4 inline mr-1" />
                Media Type
              </label>
              <Select value={filters.type} onValueChange={(value) => updateFilter('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Images
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Videos
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Captured During */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Captured During
              </label>
              <Select value={filters.capturedDuring} onValueChange={(value) => updateFilter('capturedDuring', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contexts</SelectItem>
                  <SelectItem value="pre-match">Pre-match</SelectItem>
                  <SelectItem value="match">During Match</SelectItem>
                  <SelectItem value="post-match">Post-match</SelectItem>
                  <SelectItem value="ceremony">Ceremony</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Context Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                Context
              </label>
              <Select value={filters.context} onValueChange={(value) => updateFilter('context', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Media</SelectItem>
                  <SelectItem value="tournament">Tournament Media</SelectItem>
                  <SelectItem value="match">Match Media</SelectItem>
                  <SelectItem value="venue">General Venue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific Tournament/Match */}
            {filters.context === 'tournament' && availableFixtures.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament
                </label>
                <Select value={filters.fixtureId || 'all-tournaments'} onValueChange={(value) => updateFilter('fixtureId', value === 'all-tournaments' ? undefined : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-tournaments">All Tournaments</SelectItem>
                    {availableFixtures.map((fixture) => (
                      <SelectItem key={fixture.id} value={fixture.id}>
                        {fixture.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filters.context === 'match' && availableMatches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Match
                </label>
                <Select value={filters.matchId || 'all-matches'} onValueChange={(value) => updateFilter('matchId', value === 'all-matches' ? undefined : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select match" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-matches">All Matches</SelectItem>
                    {availableMatches.map((match) => (
                      <SelectItem key={match.id} value={match.id}>
                        {match.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="h-4 w-4 inline mr-1" />
                Tags
              </label>
              <div className="space-y-2">
                <Input
                  placeholder="Add tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                />
                {filters.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {filters.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-red-100"
                        onClick={() => removeTag(tag)}
                      >
                        {tag}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
                {availableTags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Popular tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {availableTags.slice(0, 10).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-blue-50"
                          onClick={() => addTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <Button
              variant="outline"
              onClick={onClearAll}
              className="w-full"
              disabled={getActiveFilterCount() === 0}
            >
              Clear All Filters
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};