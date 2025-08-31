
import React from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Heart, Share2, MoreHorizontal } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import Image from 'next/image';

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
        
        {media && media.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            {media.map((item: any) => (
              <div key={item.id}>
                <AspectRatio ratio={16 / 9}>
                  {item.fileType.startsWith('image') ? (
                    <Image 
                      src={item.filePath} 
                      alt={item.caption || item.fileName} 
                      layout="fill" 
                      objectFit="cover" 
                      className="rounded-md"
                    />
                  ) : (
                    <video src={item.filePath} className="w-full h-full rounded-md" controls />
                  )}
                </AspectRatio>
                {item.caption && <p className="text-sm text-gray-600 mt-1">{item.caption}</p>}
              </div>
            ))}
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
