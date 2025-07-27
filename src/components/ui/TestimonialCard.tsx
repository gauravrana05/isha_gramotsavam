// src/components/ui/TestimonialCard.tsx
import React from 'react'
import Image from 'next/image'

interface TestimonialCardProps {
  id: number;
  quote: string;
  name: string;
  title: string;
  image: string;
  className?: string;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  id,
  quote,
  name,
  title,
  image,
  className = ""
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 h-full transition-all duration-300 ${className}`}>
      {/* Celebrity Image */}
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 rounded-full overflow-hidden">
          <Image
            src={image}
            alt={name}
            width={96}
            height={96}
            className="object-cover w-full h-full"
          />
        </div>
      </div>

      {/* Quote */}
      <blockquote className="text-gray-700 text-center mb-6 leading-relaxed font-fira font-light">
        "{quote}"
      </blockquote>

      {/* Name and Title */}
      <div className="text-center">
        <h4 className="font-semibold text-[#4A2F1D] text-sm font-fira">
          -{name}, {title}
        </h4>
      </div>
    </div>
  );
};

export default TestimonialCard;