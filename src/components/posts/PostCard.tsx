
import React from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Heart, Share2, MoreHorizontal } from 'lucide-react';

interface PostCardProps {
  post: any; // TODO: Replace 'any' with Post type
  className?: string;
}

const PostCard: React.FC<PostCardProps> = ({ post, className = '' }) => {
  const { author, createdAt, title, content, media, entityType, visibility } = post;

  return (
    <Card className={`post-card ${className}`}>
      <CardHeader className="flex flex-row items-center space-x-4">
        <Avatar>
          <AvatarImage src={author.profileImages?.profilePhotoPath} alt={`${author.firstName} ${author.lastName}`} />
          <AvatarFallback>{author.firstName?.charAt(0)}{author.lastName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{author.firstName} {author.lastName}</p>
          <p className="text-sm text-gray-500">{new Date(createdAt).toLocaleString()}</p>
        </div>
        <div className="flex-grow" />
        <Badge variant={visibility === 'public' ? 'default' : 'secondary'}>{visibility}</Badge>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="mb-4">{content}</p>
        
        {/* Media Carousel Placeholder */}
        {media && media.length > 0 && (
          <div className="bg-gray-200 h-64 rounded-md flex items-center justify-center">
            <p>{media.length} media item(s)</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div>
          <Badge variant="outline">{entityType}</Badge>
        </div>
        <div className="flex space-x-4 text-gray-500">
          <Button variant="ghost" size="icon">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PostCard;
