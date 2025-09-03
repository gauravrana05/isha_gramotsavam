
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Label } from '@/components/ui/Label';
import { EnhancedModal } from '../ui/EnhancedModal';
import { Upload } from 'lucide-react'; // Upload icon for media
import { api } from '@/server/trpc/react';
import { useNotification } from '@/context/NotificationContext';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';

interface PostCreatorProps {
  defaultEntityType?: 'fixture' | 'match';
  className?: string;
  onPostCreated?: (post: any) => void; // TODO: Replace 'any' with Post type
  compact?: boolean; // For mobile quick post
  isOpen?: boolean;
  onClose?: () => void;
}

const PostCreator: React.FC<PostCreatorProps> = ({ 
  defaultEntityType = 'fixture', 
  className = '', 
  onPostCreated, 
  compact = false,
  isOpen = true,
  onClose
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entityType, setEntityType] = useState(defaultEntityType);
  const [entityId, setEntityId] = useState<string | undefined>(undefined);
  const [visibility, setVisibility] = useState('public');
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDetectingContext, setIsDetectingContext] = useState(false);

  const { addNotification } = useNotification();
  const params = useParams();
  const venueId = params?.venueId as string;
  const { user } = useAuth();
  const { t } = useTranslation();

  // Fetch fixtures and matches for the context selector
  const { data: fixtures } = api.volunteers.venue.getVenueFixtures.useQuery({ venueId });

  // Auto-select first available fixture if available and none selected
  useEffect(() => {
    if (entityType === 'fixture' && fixtures && fixtures.length > 0 && !entityId) {
      setEntityId(fixtures[0].id);
    }
  }, [entityType, fixtures, entityId]);

  const createPostMutation = api.posts.create.useMutation({
    onSuccess: (post) => {
      addNotification(t('posts.create_success', 'Post created successfully'), 'success');
      onPostCreated?.(post);
      // Reset form
      setTitle('');
      setContent('');
      setMediaIds([]);
    },
    onError: (error) => {
      addNotification(t('posts.create_error', `Failed to create post: ${error.message}`), 'error');
    },
  });

  const handleCreatePost = () => {
    const postData = {
      title,
      content,
      entityType,
      entityId,
      venueId, // Add venueId for general venue posts
      visibility: visibility as 'public' | 'private',
      mediaIds,
    };
    
    console.log('Creating post with data:', postData);
    
    createPostMutation.mutate(postData);
  };


  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title={compact ? t('posts.quick_post', 'Quick Post') : t('posts.create_new', 'Create a New Post')}
      size="2xl"
      mobileFullScreen={true}
      scrollableBody={true}
      footer={
        <div className="flex justify-end items-center space-x-3">
          <Button 
            variant="outline"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreatePost} 
            disabled={createPostMutation.isPending || !title.trim()}
            className="px-6 py-2 bg-[#F28C38] hover:bg-[#E67A26] text-white disabled:opacity-50"
          >
            {createPostMutation.isPending ? 'Posting...' : 'Post'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="post-title">{t('posts.title', 'Title')} *</Label>
          <Input 
            id="post-title"
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder={t('posts.title_placeholder', 'Enter a title for your post')}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="post-content">{t('posts.content', 'Content')} *</Label>
          <Textarea 
            id="post-content"
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            placeholder={t('posts.content_placeholder', 'What do you want to share?')}
            rows={compact ? 3 : 6}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 text-right">{content.length} / 500</p>
        </div>

        <div className="space-y-1">
          <Label>{t('posts.media', 'Media')}</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#F28C38] transition-colors">
            <div className="flex flex-col items-center py-4">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">Click to upload photos or videos</p>
              <p className="text-xs text-gray-500 mb-3">JPG, PNG, MP4 up to 10MB</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = 'image/*,video/*';
                  input.onchange = (e) => {
                    const files = Array.from((e.target as HTMLInputElement).files || []);
                    console.log('Selected files:', files);
                    setSelectedFiles(prev => [...prev, ...files]);
                  };
                  input.click();
                }}
                className="px-4 py-2 text-sm"
              >
                Choose Files
              </Button>
            </div>
          </div>
          
          {/* Display selected files */}
          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Selected files:</p>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                      {file.type.startsWith('image/') ? '🖼️' : '🎥'}
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="visibility">{t('posts.visibility', 'Visibility')}</Label>
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger id="visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{t('posts.public', 'Public')}</SelectItem>
              <SelectItem value="private">{t('posts.private', 'Private')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="entity-type">{t('posts.associate_with', 'Associate with')}</Label>
            <Select value={entityType} onValueChange={(value) => setEntityType(value as 'fixture' | 'match')}>
              <SelectTrigger id="entity-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixture">{t('posts.tournament', 'Tournament')}</SelectItem>
                <SelectItem value="match">{t('posts.match', 'Match')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="entity-id">
              {entityType === 'fixture' ? t('posts.select_tournament', 'Select Tournament') : t('posts.select_match', 'Select Match')}
            </Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger id="entity-id">
                <SelectValue placeholder={entityType === 'fixture' ? t('posts.select_tournament_placeholder', 'Select a Tournament') : t('posts.select_match_placeholder', 'Select a Match')} />
              </SelectTrigger>
              <SelectContent>
                {entityType === 'fixture' && fixtures?.map((fixture) => (
                  <SelectItem key={fixture.id} value={fixture.id}>{fixture.name}</SelectItem>
                ))}
                {/* TODO: Add matches here */}
              </SelectContent>
            </Select>
          </div>
        </div>

      </div>
    </EnhancedModal>
  );
};

export default PostCreator;
