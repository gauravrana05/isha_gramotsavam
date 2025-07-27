// src/components/public/ImpactSection.tsx
import React from 'react'
import Image from 'next/image'
import Container from '../ui/Container'
import StatCard from '../ui/StatCard'

export default function ImpactSection() {
  const impactStats = [
    {
      number: '2,00,000+',
      label: 'Players'
    },
    {
      number: '18,000+',
      label: 'Teams'
    },
    {
      number: '35,000+',
      label: 'Villages'
    },
    {
      number: '38,600+',
      label: 'Women Players'
    }
  ]

  return (
    <section className="bg-white py-16 lg:py-24 relative overflow-hidden">
      {/* Top wave transition */}
      <div className="absolute top-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-8 md:h-12"
          fill="#F3F0E5"
        >
          <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"></path>
        </svg>
      </div>

      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-8">
          {/* Left Side - Statistics */}
          <div>
            <div className="text-center lg:text-left mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-8 font-fira">
                Impact
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {impactStats.map((stat, index) => (
                <StatCard
                  key={index}
                  number={stat.number}
                  label={stat.label}
                  className="lg:text-left"
                />
              ))}
            </div>
          </div>

          {/* Right Side - Decorative Image */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <Image
                src="/images/gramotsavam/impact_1.jpg"
                alt="Gramotsavam Impact"
                width={1000}
                height={800}
                className="object-cover max-w-full h-auto hover:scale-110 transition-transform duration-300"
              />
              
              {/* Floating decorative elements */}
              <div className="absolute top-10 right-10 w-6 h-6 bg-[#F28C38] rounded-full animate-pulse"></div>
              <div className="absolute bottom-20 left-10 w-4 h-4 bg-[#C79016] rounded-full animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </Container>

      {/* Bottom decorative wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-12 md:h-16 transform rotate-180"
          fill="white"
        >
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
        </svg>
      </div>
    </section>
  )
}