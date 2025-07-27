// src/components/public/VideoSection.tsx
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Container from '../ui/Container'
import { Play } from 'lucide-react'

interface VideoSectionProps {
  variant?: 'glimpses' | 'transformation'
}

export default function VideoSection({ variant = 'glimpses' }: VideoSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const content = {
    glimpses: {
      title: 'Watch Glimpses',
      subtitle: 'FROM 2024',
      thumbnail: '/images/thumbnails/gramotsavam_2024_highlights.jpg',
      bgColor: 'bg-[#F3F0E5]'
    },
    transformation: {
      title: 'How Sport Has Transformed Lives',
      subtitle: '',
      thumbnail: '/images/thumbnails/transformation_stories.jpg',
      bgColor: 'bg-white'
    }
  }

  const currentContent = content[variant]

  const handlePlay = () => {
    setIsPlaying(true)
    // Here you would implement the actual video player logic
    console.log('Playing video...')
  }

  return (
    <section className={`${currentContent.bgColor} py-16 lg:py-24 relative overflow-hidden`}>
      {/* Top wave transition for glimpses */}
      {variant === 'glimpses' && (
        <div className="absolute top-0 left-0 right-0">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block w-full h-12 md:h-16"
            fill="#F3F0E5"
          >
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
          </svg>
        </div>
      )}

      <Container size="lg" className="relative z-10">
        {/* Section Header */}
        {variant === 'glimpses' && (
          <div className="text-center mb-12 pt-8">
            <h2 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-2 font-fira">
              {currentContent.title}
            </h2>
            <h3 className="text-2xl md:text-3xl font-semibold text-[#F28C38] font-fira">
              {currentContent.subtitle}
            </h3>
          </div>
        )}

        {/* Video Player Container */}
        <div className="relative max-w-4xl mx-auto">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
            {!isPlaying ? (
              <>
                {/* Video Thumbnail */}
                <Image
                  src={currentContent.thumbnail}
                  alt={`${currentContent.title} video thumbnail`}
                  fill
                  className="object-cover"
                />
                
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/30"></div>
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={handlePlay}
                    className="bg-white/90 hover:bg-white rounded-full p-6 shadow-lg transition-all duration-300 hover:scale-110 group"
                    aria-label={`Play ${currentContent.title} video`}
                  >
                    <Play className="w-12 h-12 text-[#F28C38] ml-1 group-hover:text-[#4A2F1D] transition-colors" fill="currentColor" />
                  </button>
                </div>

                {/* Video Title Overlay for Transformation */}
                {variant === 'transformation' && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 font-fira">
                      {currentContent.title}
                    </h2>
                    <div className="flex items-center">
                      <Image
                        src="/images/icons/public_decorator_7.png"
                        alt="Play icon"
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Placeholder for actual video player */
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="font-fira">Loading video...</p>
                </div>
              </div>
            )}
          </div>

          {/* Video Description */}
          {variant === 'transformation' && (
            <div className="text-center mt-8">
              <p className="text-gray-600 text-lg font-fira">
                Discover inspiring stories of how sports have transformed lives in rural India through Isha Gramotsavam.
              </p>
            </div>
          )}
        </div>
      </Container>

      {/* Bottom wave transition for glimpses */}
      {variant === 'glimpses' && (
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block w-full h-12 md:h-16 transform rotate-180"
            fill="#F3F0E5"
          >
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"></path>
          </svg>
        </div>
      )}
    </section>
  )
}