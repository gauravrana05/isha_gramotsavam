// src/components/public/HeroSection.tsx
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '../ui/Button'
import Container from '../ui/Container'

interface HeroSectionProps {
  lang: string
}

export default function HeroSection({ lang }: HeroSectionProps) {
  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Top Image Container: Stacks on mobile, becomes a background on desktop */}
      <div className="relative h-[50vh] md:absolute md:inset-0 md:h-full">
        {/* Mobile Background */}
        <Image
          src="/images/backgrounds/mobile_public_background.png"
          alt="Isha Gramotsavam Mobile Background"
          fill
          className="object-cover md:hidden"
          priority
          quality={100}
        />

        {/* Desktop/Web Background */}
        <Image
          src="/images/backgrounds/web_public_background.jpg"
          alt="Isha Gramotsavam Web Background"
          fill
          className="hidden object-cover md:block"
          priority
          quality={100}
        />

        {/* Darkening Overlay */}
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* Main Content: Stacks below image on mobile */}
      <div className="relative z-20 flex flex-col items-center justify-center py-20 md:flex-1">
        <Container>
          {/* Content Box */}
          <div className="relative max-w-4xl rounded-2xl p-8 text-center md:p-12 lg:p-16 md:mt-64">
            {/* Vector Background:
              - The `hidden` and `md:block` classes are removed.
              - It now displays on ALL screen sizes behind the content.
            */}
            <div className="absolute inset-0 -z-10">
              <Image
                src="/images/backgrounds/public_vector_background.png"
                alt="Content Background"
                fill
                className="object-cover"
                quality={100}
              />
            </div>

            {/* Actual Text Content */}
            <div className="relative z-10">
              <h1 className="font-fira text-4xl font-extrabold text-black md:text-5xl lg:text-4xl">
                Isha Gramotsavam
              </h1>

              <div className="font-roboto mb-6 text-xl font-semibold text-black md:text-2xl">
                Sporting Spirit of Bharat
              </div>

              <p className="font-roboto md:text-md mx-auto mb-8 max-w-3xl text-lg leading-relaxed text-[#4A2F1D] md:mx-36">
                Aims to rejuvenate the spirit of rural India and foster a sense of community, tradition and healthy competition
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href={`/${lang}/public/sports`}>
                  <Button size="large" className="min-w-[200px]">
                    Register Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Event Dates Banner */}
      <div className="relative z-10 bg-[#F28C38] py-4 text-white">
        <Container>
          <p className="font-fira text-center text-lg font-semibold">
            Aug - Sep 2025
          </p>
        </Container>
      </div>
    </section>
  )
}