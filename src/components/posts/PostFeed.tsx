
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/server/trpc/react';
import PostCard from './PostCard';

interface PostFeedProps {
  entityType: 'fixture' | 'match';
  entityId: string;
  showPrivate?: boolean;
  className?: string;
}

const PostFeed: React.FC<PostFeedProps> = ({ 
  entityType, 
  entityId, 
  showPrivate = false, 
  className = '' 
}) => {
  const { data: posts, isLoading, error } = api.posts.getByContext.useQuery({
    entityType,
    entityId,
    visibility: showPrivate ? 'all' : 'public',
  });

  if (isLoading) {
    return <div>Loading posts...</div>;
  }

  if (error) {
    return <div>Error loading posts: {error.message}</div>;
  }

  return (
    <div className={`post-feed ${className}`}>
      {posts?.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

export default PostFeed;
