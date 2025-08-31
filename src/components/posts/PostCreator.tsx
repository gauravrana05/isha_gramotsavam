
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { MediaUpload } from '@/components/media/MediaUpload';
import { api } from '@/server/trpc/react';
import { useNotification } from '@/context/NotificationContext';
import { useParams } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getVolunteerCurrentAssignment, smartDetectEntity } from '@/lib/services/volunteerContext';
import { useAuth } from '@/context/AuthContext';

interface PostCreatorProps {
  defaultEntityType?: 'fixture' | 'match';
  className?: string;
  onPostCreated?: (post: any) => void; // TODO: Replace 'any' with Post type
  compact?: boolean; // For mobile quick post
}

const PostCreator: React.FC<PostCreatorProps> = ({ 
  defaultEntityType = 'fixture', 
  className = '', 
  onPostCreated, 
  compact = false 
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

  useEffect(() => {
    const detectContext = async () => {
      if (!user) return;
      setIsDetectingContext(true);
      const assignment = await getVolunteerCurrentAssignment(user.id);
      if (assignment) {
        const entity = await smartDetectEntity(assignment, entityType);
        if (entity) {
          setEntityId(entity.id);
        }
      }
      setIsDetectingContext(false);
    };
    detectContext();
  }, [user, entityType]);

  const createPostMutation = api.posts.create.useMutation({
    onSuccess: (post) => {
      addNotification({
        id: 'post-created',
        type: 'success',
        message: 'Post created successfully',
      });
      onPostCreated?.(post);
      // Reset form
      setTitle('');
      setContent('');
      setMediaIds([]);
    },
    onError: (error) => {
      addNotification({
        id: 'post-creation-error',
        type: 'error',
        message: `Failed to create post: ${error.message}`,
      });
    },
  });

  const handleCreatePost = () => {
    if (!entityId) {
      addNotification({
        id: 'entity-id-required',
        type: 'error',
        message: 'Please select a fixture or match to associate this post with.',
      });
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

  // TODO: Fetch fixtures and matches for the context selector
  const { data: fixtures } = api.volunteers.venue.getVenueFixtures.useQuery({ venueId });

  return (
    <Card className={`post-creator ${className}`}>
      <CardHeader>
        <CardTitle>{compact ? 'Quick Post' : 'Create a New Post'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="post-title">Title</Label>
          <Input 
            id="post-title"
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Enter a title for your post"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="post-content">Content</Label>
          <Textarea 
            id="post-content"
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            placeholder="What do you want to share?"
            rows={compact ? 3 : 6}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 text-right">{content.length} / 500</p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Advanced Options</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="entity-type">Associate with</Label>
                  <Select value={entityType} onValueChange={(value) => setEntityType(value as 'fixture' | 'match')}>
                    <SelectTrigger id="entity-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixture">Fixture</SelectItem>
                      <SelectItem value="match">Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="entity-id">Select {entityType}</Label>
                  <Select value={entityId} onValueChange={setEntityId}>
                    <SelectTrigger id="entity-id">
                      <SelectValue placeholder={`Select a ${entityType}`} />
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
                <Label>Media</Label>
                <MediaUpload 
                  venueId={venueId}
                  onUploadComplete={(results) => {
                    const newMediaIds = results.filter(r => r.success).map(r => r.media.id);
                    setMediaIds(prev => [...prev, ...newMediaIds]);
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="visibility">Visibility</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger id="visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => {}} disabled={isDetectingContext}>
          {isDetectingContext ? 'Detecting Context...' : 'Auto-detect Context'}
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline">Save Draft</Button>
          <Button onClick={handleCreatePost} disabled={createPostMutation.isLoading}>
            {createPostMutation.isLoading ? 'Creating...' : 'Create Post'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PostCreator;
