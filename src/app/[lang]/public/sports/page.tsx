'use client'

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { LoadingSpinner, PageLoader } from '@/components/ui/loaders';
import { AlertCircle } from 'lucide-react';
import RegistrationButton from '@/components/common/RegistrationButton';

interface SportsOverviewPageProps {
  params: Promise<{
    lang: string
  }>
}

export default function SportsOverviewPage({ params }: SportsOverviewPageProps) {
  const { user } = useAuth()
  const resolvedParams = React.use(params)
  const { lang } = resolvedParams

  // Fetch profile completion data for gender validation
  const profileDataQuery = api.profile.checkCompletion.useQuery(
    { userId: user?.id || "" },
    { 
      enabled: !!user?.id && 
               user.id.length > 0 && 
               !['admin', 'general_volunteer', 'technical_volunteer', 'verification_volunteer'].includes(user.role)
    }
  )
  const userGender = profileDataQuery.data?.gender || user?.gender || null
  
  // Fetch sports from database
  const sportsQuery = api.sports.getAllWithCategories.useQuery()
  
  // Transform database data to display format with gender validation
  const transformSportData = (sport: any) => {
    let canRegister = true
    let registrationMessage = ''
    
    // Check if user can register based on gender
    if (userGender) {
      const canUserRegister = 
        sport.supportsMixed || 
        (userGender === 'M' && sport.supportsMen) ||
        (userGender === 'F' && sport.supportsWomen)

      if (!canUserRegister) {
        canRegister = false
        const supportedCategories = []
        if (sport.supportsMen) supportedCategories.push('men')
        if (sport.supportsWomen) supportedCategories.push('women')
        if (sport.supportsMixed) supportedCategories.push('mixed teams')
        
        registrationMessage = `This sport is only available for ${supportedCategories.join(' and ')}`
      }
    }

    return {
      ...sport,
      canRegister,
      registrationMessage
    }
  }
  
  // Handle loading and error states
  if (sportsQuery.isLoading) {
    return (
      <PageLoader
        title="Loading Sports..."
        variant="brand"
        size="lg"
      />
    )
  }
  
  if (sportsQuery.error) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load sports. Please try again later.</p>
        </div>
      </div>
    )
  }
  
  const sports = sportsQuery.data?.map(transformSportData) || []
  
  return (
    <div className="bg-[#F3F0E5]">
      {/* Hero Section with Background Images */}
      <section className="relative bg-[#F3F0E5] py-16 overflow-hidden md:min-h-screen flex flex-col" >
        <div className="absolute inset-0">

          <Image
            src="/images/backgrounds/sports_background.png"
            alt="Sports Background"
            fill
            className=""
            priority
            quality={100}
          />

          {/* Darkening Overlay */}
          <div className="absolute inset-0 bg-black/10"></div>
        </div>


        {/* Background Decorative Images */}
        <div className="absolute inset-0">
          <Image
            src="/images/backgrounds/gramotsavam_sports_background_ladder.png"
            alt="Background decoration"
            width={50}
            height={1000}
            className=" absolute left-0 top-0 opacity-90 hidden md:block"
          />
          <Image
            src="/images/backgrounds/gramotsavam_sports_background_ladder_right.png"
            alt="Background decoration"
            width={52}
            height={1000}
            className="absolute right-0 top-0 opacity-90 hidden md:block"
          />
          <Image
            src="/images/backgrounds/grms_sports_bg_bottom_left_doll.png"
            alt="Background decoration"
            width={40}
            height={60}
            className="absolute left-15 bottom-0 opacity-90"
          />
          <Image
            src="/images/backgrounds/grms_sports_bg_bottom_right_doll.png"
            alt="Background decoration"
            width={60}
            height={80}
            className="absolute right-15 bottom-0 opacity-90 "
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-fira">
              Sports at Isha Gramotsavam
            </h1>
            <p className="text-lg md:text-xl text-isha-saffron mb-8 leading-relaxed font-fira">
              Aug - Sep 2025
            </p>
            <div className=" rounded-xl p-6 mb-4 md:px-24 md:mx-24 md:my-8">
              <p className="text-md md:text-xl text-white leading-relaxed font-fira">
                Volleyball, throwball and kabaddi matches are conducted at three levels: clusters, divisionals, and finals.
              </p>
            </div>

            {/* Decorative Element */}
            <div className="flex justify-center mb-8">
              <Image
                src="/images/icons/public_decorator_4.png"
                alt="Decorative divider"
                width={240}
                height={80}
                className="object-contain"
              />
            </div>
          </div>
        </div>


        {/* Sports Statistics Banner */}
        <div className="relative bg-earth-brown text-white py-2 md:pt-16 pb-8">
          <div className="container mx-auto px-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className='flex flex-col items-center justify-center'>
                <Image
                  src="/images/backgrounds/grms_sports_bg_bottom_right_doll.png"
                  alt="Background decoration"
                  width={60}
                  height={80}
                  className="scale-x-[-1] opacity-90"
                />
                <div className="text-2xl md:text-3xl font-bold text-isha-saffron font-fira">2+</div>
                <div className="text-sm md:text-base font-fira">Traditional Sports</div>
              </div>
              <div className='flex flex-col items-center justify-center'>
                <Image
                  src="/images/backgrounds/grms_sports_bg_bottom_left_doll.png"
                  alt="Background decoration"
                  width={40}
                  height={60}
                  className="opacity-90"
                />
                <div className="text-2xl md:text-3xl font-bold text-isha-saffron font-fira">18,000+</div>
                <div className="text-sm md:text-base font-fira">Teams Participating</div>
              </div>
              <div className='flex flex-col items-center justify-center'>
                <Image
                  src="/images/backgrounds/grms_sports_bg_bottom_left_doll.png"
                  alt="Background decoration"
                  width={40}
                  height={60}
                  className="scale-x-[-1] opacity-90"
                />
                <div className="text-2xl md:text-3xl font-bold text-isha-saffron font-fira">2,00,000+</div>
                <div className="text-sm md:text-base font-fira">Players</div>
              </div>
              <div className='flex flex-col items-center justify-center'>
                <Image
                  src="/images/backgrounds/grms_sports_bg_bottom_right_doll.png"
                  alt="Background decoration"
                  width={60}
                  height={80}
                  className="opacity-100 "
                />
                <div className="text-2xl md:text-3xl font-bold text-isha-saffron font-fira">35,000+</div>
                <div className="text-sm md:text-base font-fira">Villages</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sports Overview */}
      <section id="sports-details" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-earth-brown mb-4 font-fira">
              Our Sports
            </h2>
            <p className="text-lg text-earth-brown/80 max-w-2xl mx-auto font-fira">
              Discover the traditional Indian sports that bring communities together in the spirit of healthy competition
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {sports.map((sport) => {
              // Helper function to get sport image
              const getSportImage = (sportName: string): string => {
                const name = sportName.toLowerCase()
                if (name.includes('volleyball')) return '/images/sports/volleyball_1.jpg'
                if (name.includes('throwball')) return '/images/sports/throwball_1.jpg'
                return '/images/sports/volleyball_1.jpg' // fallback
              }
              
              // Helper function to format category display
              const formatCategory = (sport: any): string => {
                const categories = []
                if (sport.supportsMen) categories.push('Men')
                if (sport.supportsWomen) categories.push('Women')
                if (sport.supportsMixed) categories.push('Mixed')
                return categories.length > 0 ? `For ${categories.join(' & ')}` : 'Category TBD'
              }
              
              return (
            <div key={sport.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow font-fira">
              <div className="relative h-100">
                <Image
                  src={getSportImage(sport.name)}
                  alt={`${sport.name} at Gramotsavam`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-earth-brown mb-3 font-fira">{sport.name}</h3>
                <p className="text-earth-brown/80 mb-4 leading-relaxed font-fira">
                  {sport.description || `Experience the excitement of ${sport.name} at Isha Gramotsavam. A dynamic team sport that brings together skill, strategy, and sportsmanship.`}
                </p>

                <div className="mb-4">
                  <h4 className="font-semibold text-earth-brown mb-2">Key Features:</h4>
                  <ul className="list-disc list-inside text-sm text-earth-brown/80 space-y-1 font-fira">
                    <li>{sport.mainPlayersCount} players per team on court</li>
                    <li>Up to {sport.maxSubstitutes} substitutes allowed</li>
                    <li>{formatCategory(sport)}</li>
                    <li>Village-level tournament structure</li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-earth-brown mb-2 font-fira">Prize Structure:</h4>
                  <div className="text-sm text-earth-brown/80 font-fira">
                    <div className="flex justify-between">
                      <span>Finals Winner:</span>
                      <span className="font-semibold">₹5,00,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Division Winner:</span>
                      <span className="font-semibold">₹25,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cluster Winner:</span>
                      <span className="font-semibold">₹10,000</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`/${lang}/public/sports/${sport.id}`}
                    className="flex-1 bg-saffron lg:pl-3 py-2 rounded-lg font-semibold hover:bg-saffron/90 transition-colors"
                  >
                    Learn More
                  </Link>
                  <RegistrationButton
                    lang={lang} 
                    sport={sport.name.toLowerCase().replace(/\s+/g, '-')} 
                    sportId={sport.id}
                    size="sm" 
                    className="min-w-[200px]"
                    disabled={!sport.canRegister}
                    disabledMessage={sport.registrationMessage}
                  />
                </div>
              </div>
            </div>
            )
          })}
          </div>
        </div>
      </section>

    </div>
  );
}