// src/components/ui/StoryCard.tsx
'use client'

import React, { useState } from 'react'
import Image from 'next/image'

interface StoryCardProps {
  id: number;
  title: string;
  excerpt: string;
  fullStory: string;
  image: string;
  className?: string;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  id,
  title,
  excerpt,
  fullStory,
  image,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${className}`}>
      {/* Story Image */}
      <div className="relative aspect-[4/3]">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        {/* Story Title Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-2 font-fira">
            {title}
          </h3>
        </div>
      </div>

      {/* Story Content */}
      <div className="p-6">
        <p className="text-gray-600 mb-4 leading-relaxed font-fira">
          {isExpanded ? fullStory : excerpt}
        </p>

        <button
          onClick={toggleExpanded}
          className="text-[#F28C38] hover:text-[#4A2F1D] font-semibold transition-colors font-fira"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      </div>
    </div>
  );
};

export default StoryCard;