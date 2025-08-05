// src/components/public/QuoteSection.tsx
import React from 'react'
import Image from 'next/image'
import Container from '../ui/Container'
import DecorativeElement from '../ui/DecorativeElement'

export default function QuoteSection() {
  return (
    <section className="bg-[#F3F0E5] py-16 lg:py-24 relative overflow-hidden">
      {/* Top Wave Transition */}
      <div className="absolute top-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-12 md:h-16"
          fill="#F28C38"
        >
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
        </svg>
      </div>

      <Container size="lg" className="relative z-10">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Dancing Doll */}
          <div className="lg:col-span-2 flex justify-center">
            <DecorativeElement
              src="/images/icons/public_decorator_2.png"
              alt="Dancing doll"
              size="lg"
            />
          </div>

          {/* Quote Content */}
          <div className="lg:col-span-8 text-center">
            <blockquote className="text-xl md:text-2xl lg:text-3xl font-light text-[#4A2F1D] leading-relaxed italic mb-8 font-fira">
            &quot;Isha Gramotsavam is about raising the Human Spirit – that is what is most needed right now for rural communities to overcome social and economic challenges, and to live Healthy, Joyful, and Successful Lives.&quot;
            </blockquote>

            {/* Signature */}
            <div className="flex flex-col items-center space-y-4">
              <Image
                src="/images/icons/sadhguru_signature.png"
                alt="Sadhguru Signature"
                width={200}
                height={60}
                className="object-contain"
              />
            </div>
          </div>

          {/* Right Dancing Doll */}
          <div className="lg:col-span-2 flex justify-center">
            <DecorativeElement
              src="/images/icons/public_decorator_3.png"
              alt="Dancing doll"
              size="lg"
            />
          </div>
        </div>
      </Container>

      {/* Bottom Wave Transition */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-12 md:h-16 transform rotate-180"
          fill="#F3F0E5"
        >
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
        </svg>
      </div>
    </section>
  )
}