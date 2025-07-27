// src/components/ui/DecorativeElement.tsx
import React from 'react'
import Image from 'next/image'

interface DecorativeElementProps {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  position?: "left" | "right" | "center";
  className?: string;
}

export const DecorativeElement: React.FC<DecorativeElementProps> = ({
  src,
  alt,
  size = "md",
  position = "center",
  className = ""
}) => {
  const sizeClasses = {
    sm: "w-16 h-20",
    md: "w-24 h-30",
    lg: "w-32 h-40",
    xl: "w-40 h-50"
  };

  const positionClasses = {
    left: "justify-start",
    right: "justify-end", 
    center: "justify-center"
  };

  return (
    <div className={`flex ${positionClasses[position]} ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
        />
      </div>
    </div>
  );
};

export default DecorativeElement;