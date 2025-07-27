// src/components/public/TransformationStories.tsx
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function TransformationStories() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const stories = [
    {
      id: 1,
      title: "Inspiring Youngsters to Victory",
      excerpt: "I am the sixth son in my family. All of us in our family play volleyball but I was the only one who pursued my passi...",
      image: "/images/mani_madurai_tamil_nadu.jpg",
      fullStory: "I am the sixth son in my family. All of us in our family play volleyball but I was the only one who pursued my passion seriously. Through Gramotsavam, I found my calling and now inspire young players in my village."
    },
    {
      id: 2,
      title: "Three Generations of Champions",
      excerpt: "Nagamani, now 75 years old, has been playing throwball for the past 12 years. She says her life began with throwball....",
      image: "/images/nagamani_tamil_nadu.jpg",
      fullStory: "Nagamani, now 75 years old, has been playing throwball for the past 12 years. She says her life began with throwball. Now three generations of her family participate in Gramotsavam, creating a legacy of sportsmanship."
    }
  ]

  const [expandedStory, setExpandedStory] = useState<number | null>(null)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % stories.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + stories.length) % stories.length)
  }

  const toggleStory = (storyId: number) => {
    setExpandedStory(expandedStory === storyId ? null : storyId)
  }

  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-[#F28C38] font-fira font-semibold">TALES OF</span>
            <br />
            <span className="text-[#4A2F1D] font-fira font-extrabold">Transformation</span>
          </h2>
          <div className="flex justify-center">
            <Image
              src="/images/icons/public_decorator_6.png"
              alt="Decorative divider"
              width={240}
              height={80}
              className="object-contain"
            />
          </div>
        </div>

        {/* Stories Grid */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
                  index === currentSlide ? 'ring-2 ring-[#F28C38]' : ''
                }`}
              >
                {/* Story Image */}
                <div className="relative aspect-[4/3]">
                  <Image
                    src={story.image}
                    alt={story.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  {/* Story Title Overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {story.title}
                    </h3>
                  </div>
                </div>

                {/* Story Content */}
                <div className="p-6">
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {expandedStory === story.id ? story.fullStory : story.excerpt}
                  </p>

                  <button
                    onClick={() => toggleStory(story.id)}
                    className="text-[#F28C38] hover:text-[#4A2F1D] font-semibold transition-colors"
                  >
                    {expandedStory === story.id ? 'Show Less' : 'Show More'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors"
            aria-label="Previous story"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors"
            aria-label="Next story"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-8 space-x-2">
            {stories.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-[#F28C38]' : 'bg-gray-300'
                }`}
                aria-label={`Go to story ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}