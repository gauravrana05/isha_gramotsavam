'use client';

import React, { useState, useEffect } from 'react';
import { Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/AdvancedDialog';
import { MediaItem, MediaMetadata } from '@/lib/types/media';

interface MediaEditModalProps {
  mediaItem: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (mediaId: string, updates: Partial<MediaItem>) => Promise<boolean>;
  isAdmin?: boolean;
}

export const MediaEditModal: React.FC<MediaEditModalProps> = ({
  mediaItem,
  isOpen,
  onClose,
  onSave,
  isAdmin = false
}) => {
  const [formData, setFormData] = useState<Partial<MediaItem>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when media item changes
  useEffect(() => {
    if (mediaItem) {
      setFormData({
        title: mediaItem.title,
        description: mediaItem.description || '',
        tags: mediaItem.tags || [],
        capturedDuring: mediaItem.capturedDuring,
        location: mediaItem.location || ''
      });
    } else {
      setFormData({});
    }
    setError(null);
  }, [mediaItem]);

  const handleInputChange = (field: keyof MediaItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    handleInputChange('tags', tags);
  };

  const handleSave = async () => {
    if (!mediaItem) return;

    // Validation
    if (!formData.title?.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updates: Partial<MediaItem> = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        tags: formData.tags || [],
        capturedDuring: formData.capturedDuring,
        location: formData.location?.trim() || ''
      };

      const success = await onSave(mediaItem.mediaId, updates);
      
      if (success) {
        onClose();
      } else {
        setError('Failed to save changes. Please try again.');
      }
    } catch (error) {
      // Error handling removed
      setError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  if (!mediaItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Media
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Media Preview */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {mediaItem.type === 'image' ? (
                <img
                  src={mediaItem.url}
                  alt={mediaItem.title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : (
                <video
                  src={mediaItem.url}
                  poster={mediaItem.thumbnailUrl}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{mediaItem.fileName}</p>
              <p className="text-sm text-gray-500">
                {mediaItem.type.toUpperCase()} • {Math.round(mediaItem.fileSize / 1024)} KB
              </p>
              <p className="text-sm text-gray-500">
                Uploaded by {mediaItem.uploadedByName}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter media title"
                disabled={saving}
              />
            </div>

            <div>
              <Label htmlFor="capturedDuring">Captured During</Label>
              <Select
                value={formData.capturedDuring || ''}
                onValueChange={(value) => handleInputChange('capturedDuring', value)}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-match">Pre-match</SelectItem>
                  <SelectItem value="match">During Match</SelectItem>
                  <SelectItem value="post-match">Post-match</SelectItem>
                  <SelectItem value="ceremony">Ceremony</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Specific location (e.g., Goal Area)"
                disabled={saving}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what's happening in this media"
                rows={3}
                disabled={saving}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => handleTagsChange(e.target.value)}
                placeholder="goal, celebration, team-photo (comma separated)"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate tags with commas. These help in searching and organizing media.
              </p>
            </div>
          </div>

          {/* Current Tags Preview */}
          {formData.tags && formData.tags.length > 0 && (
            <div>
              <Label>Tag Preview</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};