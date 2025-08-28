// src/components/public/SportsPreview.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Button from '../ui/Button'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/server/trpc/react'
import { LoadingSpinner, PageLoader } from '../ui/loaders'
import { AlertCircle, Users, Trophy } from 'lucide-react'

interface SportsPreviewProps {
  lang: string
}

interface SportCard {
  id: string
  name: string
  description: string | null
  mainPlayersCount: number
  maxSubstitutes: number
  gender_categories: string[]
  supports_men: boolean
  supports_women: boolean
  supports_mixed: boolean
  can_register: boolean
  registration_message: string
  image_url: string
  prize_amount: string
}

// Helper function to get sport image
const getSportImage = (sportName: string): string => {
  const name = sportName.toLowerCase()
  if (name.includes('volleyball')) return '/images/sports/volleyball_1.jpg'
  if (name.includes('throwball')) return '/images/sports/throwball_1.jpg'
  return '/images/sports/volleyball_1.jpg' // fallback
}

// Helper function to format category display
const formatCategory = (sport: SportCard): string => {
  const categories = []
  if (sport.supports_men) categories.push('Men')
  if (sport.supports_women) categories.push('Women')
  if (sport.supports_mixed) categories.push('Mixed')
  
  return categories.length > 0 ? `For ${categories.join(' & ')}` : 'Category TBD'
}

// Helper function to format player count
const formatPlayerCount = (mainPlayers: number, substitutes: number): string => {
  return `${mainPlayers} + ${substitutes} Players Per Team`
}

export default function SportsPreview({ lang }: SportsPreviewProps) {
  const { user } = useAuth()
  
  // Fetch sports from database
  const sportsQuery = api.sports.getAllWithCategories.useQuery()
  
  // Transform database data to display format
  const transformSportData = (sport: any): SportCard => {
    const userGender = user?.gender || null
    let can_register = true
    let registration_message = ''
    
    // Check if user can register based on gender
    if (userGender) {
      const canUserRegister = 
        sport.supports_mixed || 
        (userGender === 'M' && sport.supports_men) ||
        (userGender === 'F' && sport.supports_women)

      if (!canUserRegister) {
        can_register = false
        const supportedCategories = []
        if (sport.supports_men) supportedCategories.push('men')
        if (sport.supports_women) supportedCategories.push('women')
        if (sport.supports_mixed) supportedCategories.push('mixed teams')
        
        registration_message = `This sport is only available for ${supportedCategories.join(' and ')}`
      }
    }

    return {
      ...sport,
      can_register,
      registration_message,
      image_url: getSportImage(sport.name),
      prize_amount: 'INR 5,00,000' // This could come from database later
    }
  }

  if (sportsQuery.isLoading) {
    return <PageLoader title="Loading sports..." variant="minimal" />;
  }

  if (sportsQuery.error) {
    return (
      <section id="sports-preview" className="bg-isha font-fira py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load sports. Please try again later.</p>
          </div>
        </div>
      </section>
    )
  }

  const sports = sportsQuery.data?.map(transformSportData) || []

  return (
    <section id="sports-preview" className="bg-isha font-fira py-16 lg:py-24">
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
                  src={sport.image_url}
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
                  <p className="text-[#F28C38] font-semibold text-lg mb-2 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {formatCategory(sport)} | {formatPlayerCount(sport.mainPlayersCount, sport.maxSubstitutes)}
                  </p>
                  <p className="text-2xl font-bold text-[#4A2F1D] mb-1 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Winning Prize: {sport.prize_amount}
                  </p>
                </div>
                
                {/* Registration Period */}
                <p className="text-gray-600 text-sm mb-2">
                  Registration: Jan 1, 2025 - Feb 15, 2025
                </p>

                <p className="text-gray-600 mb-6">
                  Registration is free & mandatory
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {sport.can_register ? (
                    <Link href={`/${lang}/public/register/team/${sport.id}`}>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full sm:w-auto bg-[#F28C38] hover:bg-[#E07B27] text-white border-none"
                      >
                        Register Team
                      </Button>
                    </Link>
                  ) : (
                    <div className="group relative">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto opacity-50 cursor-not-allowed"
                        disabled
                      >
                        Register Team
                      </Button>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        {sport.registration_message}
                        <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  )}
                  
                  <Link href={`/${lang}/public/sports/${sport.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto border-[#4A2F1D] text-[#4A2F1D] hover:bg-[#4A2F1D] hover:text-white"
                    >
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show message if no sports available */}
        {sports.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No sports available at the moment.</p>
          </div>
        )}
      </div>
    </section>
  )
}