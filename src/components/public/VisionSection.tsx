// src/components/public/VisionSection.tsx
import React from 'react'
import Image from 'next/image'
import Container from '../ui/Container'
import SectionDivider from '../ui/SectionDivider'

export default function VisionSection() {
  return (
    <section className="bg-[#F3F0E5] py-16 lg:py-24 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#F28C38] rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-[#C79016] rounded-full blur-3xl"></div>
      </div>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left Side - Content */}
          <div className="order-2 lg:order-1">
            <div className="text-center lg:text-left mb-8">
              <h3 className="text-2xl font-semibold text-[#F28C38] mb-2 font-fira">
                VISION BEHIND
              </h3>
              <h2 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-6 font-fira">
                Gramotsavam
              </h2>
              <div className="flex justify-center lg:justify-start">
                <SectionDivider type="decorative" className="my-0" />
              </div>
            </div>

            <div className="prose prose-lg text-[#4A2F1D] leading-relaxed font-fira max-w-none">
              <p className="mb-6 text-lg">
                Over 60% of rural India is of working age, yet it faces challenges due to unviable agriculture and non-inclusive growth. The rural youth find themselves engulfed by abject poverty and succumb to addictions. <strong className="text-[#F28C38]">Isha Gramotsavam</strong> is an endeavor to <strong className="text-[#F28C38]">rekindle the rural spirit</strong> and bring back the celebratory mode in the rural community.
              </p>
              
              <p className="text-lg">
                Through <strong className="text-[#F28C38]">sports</strong> and an elaborate display of <strong className="text-[#F28C38]">rural culture</strong>, Isha Gramotsavam has become an <strong className="text-[#F28C38]">effective tool to transform society</strong> by helping villagers stay away from addictions, breaking caste barriers, empowering women, and reviving the resilient rural spirit.
              </p>
            </div>
          </div>

          {/* Right Side - Image */}
          <div className="order-1 lg:order-2">
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="/images/backgrounds/vision_background.jpg"
                  alt="Vision Behind Gramotsavam"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              
              {/* Decorative floating elements */}
              <div className="absolute -top-6 -right-6 w-12 h-12 bg-[#F28C38] rounded-full opacity-80"></div>
              <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-[#C79016] rounded-full opacity-60"></div>
            </div>
          </div>
        </div>
      </Container>

      {/* Bottom decorative wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-8 md:h-12"
          fill="white"
        >
          <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"></path>
        </svg>
      </div>
    </section>
  )
}