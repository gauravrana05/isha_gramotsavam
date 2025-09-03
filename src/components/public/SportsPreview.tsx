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
import { useTranslation } from '@/lib/utils/i18n'

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

export default function SportsPreview({ lang }: SportsPreviewProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  
  // Fetch sports from database
  const sportsQuery = api.sports.getAllWithCategories.useQuery()
  
  // Helper function to format category display
  const formatCategory = (sport: SportCard): string => {
    const categories = []
    if (sport.supports_men) categories.push(t('sports.categories.men', 'Men'))
    if (sport.supports_women) categories.push(t('sports.categories.women', 'Women'))
    if (sport.supports_mixed) categories.push(t('sports.categories.mixed', 'Mixed'))
    
    if (categories.length > 0) {
      const template = t('sports.for_categories', 'For {{categories}}');
      const templateStr = typeof template === 'string' ? template : 'For {{categories}}';
      return String(templateStr).replace('{{categories}}', categories.join(' & '));
    }
    return t('sports.category_tbd', 'Category TBD') || 'Category TBD';
  }

  // Helper function to format player count
  const formatPlayerCount = (mainPlayers: number, substitutes: number): string => {
    const template = t('sports.players_per_team', '{{main}} + {{subs}} Players Per Team');
    const templateStr = typeof template === 'string' ? template : '{{main}} + {{subs}} Players Per Team';
    return templateStr
      .replace('{{main}}', mainPlayers.toString())
      .replace('{{subs}}', substitutes.toString())
  }
  
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
        if (sport.supports_men) supportedCategories.push(t('sports.categories.men', 'men'))
        if (sport.supports_women) supportedCategories.push(t('sports.categories.women', 'women'))
        if (sport.supports_mixed) supportedCategories.push(t('sports.categories.mixed_teams', 'mixed teams'))
        
        registration_message = String(t('sports.registration_restricted', 'This sport is only available for {{categories}}'))
          .replace('{{categories}}', supportedCategories.join(' and '))
      }
    }

    return {
      ...sport,
      can_register,
      registration_message,
      image_url: getSportImage(sport.name),
      prize_amount: t('sports.prize_amount', 'INR 5,00,000')
    }
  }

  if (sportsQuery.isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('sports.title', 'Sports Categories')}
            </h2>
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
              <span className="ml-3 text-gray-600">{t('sports.loading', 'Loading sports...')}</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (sportsQuery.error) {
    return (
      <section className="py-16 bg-red-50">
        <div className="container mx-auto px-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-700 mb-2">
            {t('sports.error_title', 'Unable to Load Sports')}
          </h3>
          <p className="text-red-600">
            {t('sports.error_message', 'Please try again later or contact support if the problem persists.')}
          </p>
        </div>
      </section>
    );
  }

  const sports = sportsQuery.data?.map(transformSportData) || []

  return (
    <section id="sports-preview" className="py-16 bg-gradient-to-br from-[#F28C38] to-[#E67E22]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-fira text-3xl md:text-4xl font-bold text-white mb-4">
            {t('sports.title', 'Sports & Events')}
          </h2>
          <p className="font-fira text-lg text-white/90 max-w-2xl mx-auto">
            {t('sports.description', 'Experience the thrill of traditional and modern sports in the heart of rural India')}
          </p>
        </div>

        {/* Sports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {sports.map((sport) => (
            <div key={sport.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              {/* Sport Image */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={sport.image_url}
                  alt={sport.name}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 right-4 bg-[#F28C38] text-white px-3 py-1 rounded-full text-sm font-semibold">
                  <Trophy className="w-4 h-4 inline mr-1" />
                  {sport.prize_amount}
                </div>
              </div>

              {/* Sport Content */}
              <div className="p-6">
                <h3 className="font-fira text-xl font-bold text-gray-900 mb-2">
                  {sport.name}
                </h3>
                
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {sport.description || t('sports.default_description', 'Join this exciting sport and showcase your skills!')}
                </p>

                {/* Sport Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-2" />
                    {formatPlayerCount(sport.mainPlayersCount, sport.maxSubstitutes)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatCategory(sport)}
                  </div>
                </div>

                {/* Registration Status */}
                {!sport.can_register && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-700">
                      {sport.registration_message}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Link 
                    href={`/${lang}/public/sports/${sport.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      {t('sports.learn_more', 'Learn More')}
                    </Button>
                  </Link>
                  
                  {sport.can_register && (
                    <Link 
                      href={`/${lang}/public/register/team/${sport.id}`}
                      className="flex-1"
                    >
                      <Button variant="primary" className="w-full">
                        {t('sports.register_team', 'Register Team')}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Sports Button */}
        <div className="text-center">
          <Link href={`/${lang}/public/sports`}>
            <Button size="lg" variant="secondary" className="bg-white text-[#F28C38] hover:bg-gray-50">
              {t('sports.view_all', 'View All Sports')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
