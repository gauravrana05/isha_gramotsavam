
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Label } from '@/components/ui/Label';
import { EnhancedModal } from '../ui/EnhancedModal';
import { MediaUpload } from '@/components/media/MediaUpload';
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
    if (!entityId) {
      addNotification(t('posts.entity_required', 'Please select a fixture or match to associate this post with.'), 'error');
      return;
    }

    createPostMutation.mutate({
      title,
      content,
      entityType,
      entityId,
      visibility: visibility as 'public' | 'private',
      mediaIds,
    });
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
        <div className="flex justify-end items-center space-x-2">
          <div className="relative">
            <Button 
              variant="outline"
              className="px-4 md:px-8 py-3 md:py-2 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-200 hover:to-gray-300 text-sm md:text-base rounded-lg bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-900 hover:to-purple-900 bg-clip-text text-transparent border-0 relative z-10 transition-all duration-200"
            >
              {t('posts.save_draft', 'Save Draft')}
            </Button>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-[2px]">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg w-full h-full"></div>
            </div>
          </div>
          <Button 
            onClick={handleCreatePost} 
            disabled={createPostMutation.isPending}
            className="px-4 md:px-8 py-3 md:py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm md:text-base"
          >
            {createPostMutation.isPending ? t('posts.creating', 'Creating...') : t('posts.create_post', 'Create Post')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="post-title">{t('posts.title', 'Title')}</Label>
          <Input 
            id="post-title"
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder={t('posts.title_placeholder', 'Enter a title for your post')}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="post-content">{t('posts.content', 'Content')}</Label>
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

        <div className="space-y-1">
          <Label>{t('posts.media', 'Media')}</Label>
          <MediaUpload 
            venueId={venueId}
            simple={true}
            onUploadComplete={(results) => {
              const newMediaIds = results.filter(r => r.success).map(r => r.media.id);
              setMediaIds(prev => [...prev, ...newMediaIds]);
            }}
          />
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

      </div>
    </EnhancedModal>
  );
};

export default PostCreator;
