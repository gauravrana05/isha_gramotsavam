
import React from 'react';
import { Card } from '@/components/ui/Card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import Image from 'next/image';

interface MediaGridProps {
  mediaItems: any[]; // TODO: Replace 'any' with Media type
  className?: string;
}

const MediaGrid: React.FC<MediaGridProps> = ({ mediaItems, className = '' }) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {mediaItems.map((media) => (
        <Card key={media.id}>
          <AspectRatio ratio={1 / 1}>
            {media.fileType.startsWith('image') ? (
              <Image 
                src={media.filePath} 
                alt={media.fileName} 
                layout="fill" 
                objectFit="cover" 
                className="rounded-md"
              />
            ) : (
              <video src={media.filePath} className="w-full h-full rounded-md" controls />
            )}
          </AspectRatio>
        </Card>
      ))}
    </div>
  );
};

export default MediaGrid;
