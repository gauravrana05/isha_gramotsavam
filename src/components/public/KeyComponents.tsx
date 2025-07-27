// src/components/public/KeyComponents.tsx
import React from 'react'
import Image from 'next/image'
import Container from '../ui/Container'
import SectionDivider from '../ui/SectionDivider'

export default function KeyComponents() {
  const components = [
    {
      image: "/images/sports/volleyball_2.jpg",
      title: "Sports Competition",
      description: "Volleyball, throwball, and kabaddi matches are played over several weeks at three levels: clusters, divisionals, and finals."
    },
    {
      image: "/images/sports/throwball_2.jpg",
      title: "Grand Finals",
      description: "The finals are a three-day celebration of sports held in the presence of Adiyogi."
    },
    {
      image: "/images/culturals/cultural_showcase_1.jpg",
      title: "Cultural Showcase",
      description: "Rural culture, games, dance, music, arts, and cuisine are added attractions at the event."
    }
  ]

  return (
    <section className="bg-white py-16 lg:py-24 relative overflow-hidden">
      {/* Top wave transition */}
      <div className="absolute top-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-12 md:h-16"
          fill="white"
        >
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
        </svg>
      </div>

      <Container className="relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 pt-8">
          <h2 className="text-4xl md:text-5xl font-semibold text-[#4A2F1D] mb-8 font-fira">
            KEY COMPONENTS
          </h2>
          <SectionDivider type="decorative" className="my-8" />
        </div>

        {/* Components Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {components.map((component, index) => (
            <div
              key={index}
              className="text-center group hover:transform hover:scale-105 transition-transform duration-300"
            >
              {/* Component Image */}
              <div className="relative aspect-[4/3] mb-6 overflow-hidden rounded-lg shadow-lg">
                <Image
                  src={component.image}
                  alt={component.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent group-hover:from-black/40 transition-colors duration-300"></div>
                
                {/* Title overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-bold text-white mb-2 font-fira">
                    {component.title}
                  </h3>
                </div>
              </div>

              {/* Component Description */}
              <p className="text-gray-600 leading-relaxed font-fira px-4">
                {component.description}
              </p>
            </div>
          ))}
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
          <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"></path>
        </svg>
      </div>
    </section>
  )
}