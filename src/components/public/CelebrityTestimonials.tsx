// src/components/public/CelebrityTestimonials.tsx
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CelebrityTestimonials() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const testimonials = [
    {
      id: 1,
      quote: "Gramotsavam is a great opportunity for the sportsmen and women of rural India. Make use of it.",
      name: "Venkatesh Prasad",
      title: "Former Indian Cricketer, Cricket Coach & Arjuna Award Winner",
      image: "/images/celebrity/venkatesh.jpg"
    },
    {
      id: 2,
      quote: "What I witnessed here makes me so proud of Bharat's sporting spirit. I hope Gramotsavam inspires everyone to play a sport.",
      name: "Virender Sehwag",
      title: "Former Indian Cricketer, Padma Shri & Arjuna Award Winner",
      image: "/images/celebrity/shewag.jpg"
    },
    {
      id: 3,
      quote: "Gramotsavam prepares rural players to participate in national and international competitions and empowers women in sports.",
      name: "Thulasimathi Murugesan",
      title: "Indian Paralympic Badminton Medalist",
      image: "/images/celebrity/thulasi.jpg"
    }
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonials.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="bg-white py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="font-fira font-semibold text-[#F28C38]">CELEBRITIES</span>
            <br />
            <span className="text-[#4A2F1D] font-fira font-extrabold">Share</span>
          </h2>
          <div className="flex justify-center">
            <Image
              src="/images/icons/public_decorator_4_small.png"
              alt="Decorative divider"
              width={120}
              height={40}
              className="object-contain"
            />
          </div>
        </div>

        {/* Testimonials Slider */}
        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className={`transition-all duration-300 ${
                  index === currentSlide ? 'opacity-100 scale-100' : 'opacity-70 scale-95'
                }`}
              >
                <div className="bg-white rounded-lg shadow-lg p-6 h-full">
                  {/* Celebrity Image */}
                  <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        width={96}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-gray-700 text-center mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>

                  {/* Name and Title */}
                  <div className="text-center">
                    <h4 className="font-semibold text-[#4A2F1D] text-sm">
                      -{testimonial.name}, {testimonial.title}
                    </h4>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors hidden lg:block"
            aria-label="Previous testimonial"
          > 
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors hidden lg:block"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-8 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-[#F28C38]' : 'bg-gray-300'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
