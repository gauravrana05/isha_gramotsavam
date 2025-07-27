// src/components/public/CulturalEvents.tsx
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Container from '../ui/Container'
import Button from '../ui/Button'

interface CulturalEventsProps {
  lang: string
}

export default function CulturalEvents({ lang }: CulturalEventsProps) {
  return (
    <section className="bg-[#F3F0E5] py-16 lg:py-24 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 opacity-20">
        <Image
          src="/images/icons/public_decorator_1.png"
          alt="Decorative element"
          width={100}
          height={120}
          className="object-contain"
        />
      </div>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Image */}
          <div className="order-2 lg:order-1">
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="/images/culturals/cultural_showcase_main.jpg"
                  alt="Cultural Events at Gramotsavam"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              
              {/* Floating decorative elements */}
              <div className="absolute -top-6 -right-6 w-12 h-12 bg-[#F28C38] rounded-full opacity-80"></div>
              <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-[#C79016] rounded-full opacity-60"></div>
            </div>
          </div>

          {/* Right Side - Content */}
          <div className="order-1 lg:order-2">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-semibold text-[#F28C38] mb-2 font-fira">
                Cultural
              </h2>
              <h3 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-6 font-fira">
                Events
              </h3>
              
              <p className="text-lg text-[#4A2F1D] mb-8 leading-relaxed font-fira">
                Local culture, arts, dance, music, traditional games and cuisine are showcased at the event.
              </p>
              
              <div className="flex justify-center lg:justify-start">
                <Link href={`/${lang}/public/culturals`}>
                  <Button variant="primary" size="large">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Decorative Elements */}
      <div className="absolute bottom-10 right-10 opacity-20">
        <Image
          src="/images/icons/public_decorator_3.png"
          alt="Decorative element"
          width={100}
          height={120}
          className="object-contain"
        />
      </div>
    </section>
  )
}