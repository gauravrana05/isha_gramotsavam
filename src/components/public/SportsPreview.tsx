// src/components/public/SportsPreview.tsx
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '../ui/Button'

interface SportsPreviewProps {
  lang: string
}

interface SportData {
  id: string
  name: string
  category: string
  players: string
  prize: string
  image: string
  registrationLink: string
  learnMoreLink: string
  eventInfo: {
    registrationStart: string
    registrationEnd: string
  }
}

export default function SportsPreview({ lang }: SportsPreviewProps) {
  const sports: SportData[] = [
    {
      id: 'volleyball',
      name: 'Volleyball',
      category: 'For Men',
      players: '6 + 6 Players Per Team',
      prize: 'INR 5,00,000',
      image: '/images/sports/volleyball_1.jpg',
      registrationLink: `/${lang}/auth/register`,
      learnMoreLink: `/${lang}/public/sports/volleyball`,
      eventInfo: {
        registrationStart: '2025-01-01',
        registrationEnd: '2025-02-15'
      }
    },
    {
      id: 'throwball',
      name: 'Throwball',
      category: 'For Women',
      players: '7 + 5 Players Per Team',
      prize: 'INR 5,00,000',
      image: '/images/sports/throwball_1.jpg',
      registrationLink: `/${lang}/auth/register`,
      learnMoreLink: `/${lang}/public/sports/throwball`,
      eventInfo: {
        registrationStart: '2025-01-01',
        registrationEnd: '2025-02-15'
      }
    }
  ]

  const formatSportsData = (sport: SportData) => {
    return {
      id: sport.id,
      name: sport.name,
      category: sport.category,
      players: sport.players,
      prize: sport.prize,
      image: sport.image,
      registrationLink: sport.registrationLink,
      learnMoreLink: sport.learnMoreLink
    }
  }

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
          {sports.map((sport) => {
            const sportData = formatSportsData(sport);
            return (
            <div
              key={sportData.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              {/* Sport Image */}
              <div className="relative h-64">
                <Image
                  src={sportData.image}
                  alt={sportData.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20"></div>
              </div>

              {/* Sport Content */}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#4A2F1D] mb-2">
                  {sportData.name}
                </h3>

                <div className="mb-4">
                  <p className="text-[#F28C38] font-semibold text-lg mb-2">
                    {sportData.category} | {sportData.players}
                  </p>
                  <p className="text-2xl font-bold text-[#4A2F1D] mb-1">
                    Winning Prize: {sportData.prize}
                  </p>
                </div>
                
                {/* Registration Period */}
                <p className="text-gray-600 text-sm mb-2">
                  Registration: {new Date(sport.eventInfo.registrationStart).toLocaleDateString()} - {new Date(sport.eventInfo.registrationEnd).toLocaleDateString()}
                </p>

                <p className="text-gray-600 mb-6">
                  Registration is free & mandatory
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={sportData.registrationLink}>
                    <Button size="small" className="min-w-[200px] w-full">
                      Register Now
                    </Button>
                  </Link>
                  <Link
                    href={sportData.learnMoreLink}
                    className="btn-secondary flex-1 text-center py-3 px-6"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
            );
          })}
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
}
