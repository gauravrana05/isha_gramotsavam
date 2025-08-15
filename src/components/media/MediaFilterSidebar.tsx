'use client';

import React, { useState } from 'react';
import { X, Filter, Search, Calendar, User, Tag, MapPin, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Badge } from '@/components/ui/badge';

export interface MediaFilterState {
  search: string;
  type: 'all' | 'image' | 'video';
  capturedDuring: string;
  tags: string[];
}

interface MediaFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: MediaFilterState;
  onFiltersChange: (filters: MediaFilterState) => void;
  onClearAll: () => void;
  availableTags?: string[];
}

export const MediaFilterSidebar: React.FC<MediaFilterSidebarProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onClearAll,
  availableTags = []
}) => {
  const [tagInput, setTagInput] = useState('');

  const updateFilter = (key: keyof MediaFilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
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
    if (filters.tags.length > 0) count++;
    return count;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
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