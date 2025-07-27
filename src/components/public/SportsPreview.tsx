// src/components/public/SportsPreview.tsx
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '../ui/Button'

interface SportsPreviewProps {
  lang: string
}

export default function SportsPreview({ lang }: SportsPreviewProps) {
  const sports = [
    {
      id: 'volleyball',
      name: 'Volleyball',
      category: 'For Men',
      players: '6 + 1 Players Per Team',
      prize: 'INR 5,00,000',
      image: '/images/sports/volleyball_1.jpg',
      registrationLink: '#',
      learnMoreLink: `/${lang}/public/sports/volleyball`
    },
    {
      id: 'throwball',
      name: 'Throwball',
      category: 'For Women',
      players: '7 + 1 Players Per Team',
      prize: 'INR 5,00,000',
      image: '/images/sports/throwball_1.jpg',
      registrationLink: '#',
      learnMoreLink: `/${lang}/public/sports/throwball`
    }
  ]

  return (
    <section className="bg-isha py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-fira text-[#4A2F1D] mb-4">
            Sports
          </h2>
          <div className="flex justify-center mb-8">
            <Image
              src="/images/icons/public_decorator_4.png"
              alt="Decorative divider"
              width={120}
              height={40}
              className="object-contain"
            />
          </div>
        </div>

        {/* Sports Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {sports.map((sport) => (
            <div
              key={sport.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              {/* Sport Image */}
              <div className="relative h-64">
                <Image
                  src={sport.image}
                  alt={sport.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20"></div>
              </div>

              {/* Sport Content */}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#4A2F1D] mb-2">
                  {sport.name}
                </h3>

                <div className="mb-4">
                  <p className="text-[#F28C38] font-semibold text-lg mb-2">
                    {sport.category} | {sport.players}
                  </p>
                  <p className="text-2xl font-bold text-[#4A2F1D] mb-1">
                    Winning Prize: {sport.prize}
                  </p>
                </div>

                <p className="text-gray-600 mb-6">
                  Registration is free & mandatory
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                <Button size="small" className="min-w-[200px]">
                    Register Now
                  </Button>
                  <Link
                    href={sport.learnMoreLink}
                    className="btn-secondary flex-1 text-center py-3 px-6"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Sports Link */}
        <div className="text-center mt-12">
          <Link
            href={`/${lang}/public/sports`}
            className="inline-flex items-center text-[#F28C38] hover:text-[#4A2F1D] font-semibold text-lg transition-colors"
          >
            View All Sports
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
