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
    },
    {
      id: 4,
      quote: "Sports has the power to unite communities and break barriers. Gramotsavam exemplifies this beautifully in rural India.",
      name: "P.V. Sindhu",
      title: "Olympic Medalist, Badminton Champion & Padma Bhushan Recipient",
      image: "/images/celebrity/thulasi.jpg"
    },
    {
      id: 5,
      quote: "The rural sports revolution through Gramotsavam is inspiring. It's creating champions from villages across India.",
      name: "Abhinav Bindra",
      title: "Olympic Gold Medalist, Shooting & Padma Bhushan Recipient",
      image: "/images/celebrity/thulasi.jpg"
    },
    {
      id: 6,
      quote: "Gramotsavam is nurturing talent at the grassroots level. This initiative will produce future Olympic champions.",
      name: "Mary Kom",
      title: "Olympic Medalist, Boxing Champion & Padma Bhushan Recipient",
      image: "/images/celebrity/thulasi.jpg"
    },
    {
      id: 7,
      quote: "The transformation I see in rural youth through sports is remarkable. Gramotsavam is changing lives and communities.",
      name: "Pullela Gopichand",
      title: "Former All England Badminton Champion & Chief Coach",
      image: "/images/celebrity/thulasi.jpg"
    }
  ]

  const maxVisibleSlides = 3
  const maxStartIndex = testimonials.length - maxVisibleSlides

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev < maxStartIndex ? prev + 1 : 0))
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : maxStartIndex))
  }

  const getVisibleTestimonials = () => {
    return testimonials.slice(currentSlide, currentSlide + maxVisibleSlides)
  }

  return (
    <section className="bg-white py-8 lg:py-24">
      <div className="max-w-7xl mx-auto pb-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="font-fira font-semibold text-[#F28C38]">CELEBRITIES <span className="text-[#4A2F1D] font-fira font-extrabold">Share</span></span>
            <br />
            
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

        {/* Desktop Testimonials Slider */}
        <div className="relative max-w-5xl mx-auto hidden md:block">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-700 ease-in-out my-10"
              style={{ transform: `translateX(-${currentSlide * (100 / 3)}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className="w-1/3 flex-shrink-0 px-4"
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
                    <blockquote className="text-gray-700 text-center mb-6 leading-relaxed font-fira">
                      &quot;{testimonial.quote}&quot;
                    </blockquote>

                    {/* Name and Title */}
                    <div className="text-center">
                      <h4 className="font-semibold text-[#4A2F1D] text-sm font-fira">
                        -{testimonial.name}, {testimonial.title}
                      </h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows - Desktop */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 hover:shadow-xl transition-all duration-300"
            aria-label="Previous testimonial"
          > 
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 hover:shadow-xl transition-all duration-300"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Mobile Testimonials Slider */}
        <div className="relative md:hidden">
          <div className="flex overflow-x-auto gap-4 px-4 snap-x snap-mandatory" 
               style={{ 
                 scrollbarWidth: 'none', 
                 msOverflowStyle: 'none',
                 WebkitScrollbar: { display: 'none' }
               }}>
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className="flex-shrink-0 w-80 snap-center py-8"
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
                  <blockquote className="text-gray-700 text-center mb-6 leading-relaxed font-fira">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>

                  {/* Name and Title */}
                  <div className="text-center">
                    <h4 className="font-semibold text-[#4A2F1D] text-sm font-fira">
                      -{testimonial.name}, {testimonial.title}
                    </h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicator - Desktop Only */}
        <div className="hidden md:flex justify-center mt-8 space-x-2">
          {Array.from({ length: maxStartIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                index === currentSlide ? 'bg-[#F28C38]' : 'bg-gray-300'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
