// src/app/[lang]/public/sports/[sportId]/page.tsx
'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import SectionDivider from '@/components/ui/SectionDivider'
import CelebrityTestimonials from '@/components/public/CelebrityTestimonials'
import TransformationStories from '@/components/public/TransformationStories'
import FAQSection from '@/components/public/FAQSection'
import DecorativeElement from '@/components/ui/DecorativeElement'
import PrizeDisplay from '@/components/public/PrizeDisplay'
import RegistrationButton from '@/components/common/RegistrationButton'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/server/trpc/react'
import { LoadingSpinner, PageLoader } from '@/components/ui/loaders'
import { AlertCircle } from 'lucide-react'

// Helper function to get sport images
const getSportImages = (sportName: string) => {
  const name = sportName.toLowerCase()
  if (name.includes('volleyball')) {
    return {
      mobile: '/images/sports/mobile_volleyball_3.jpg',
      web: '/images/sports/web_volleyball_3.jpg'
    }
  }
  if (name.includes('throwball')) {
    return {
      mobile: '/images/sports/mobile_throwball_3.png',
      web: '/images/sports/web_throwball_3.png'
    }
  }
  // Fallback to volleyball images
  return {
    mobile: '/images/sports/mobile_volleyball_3.jpg',
    web: '/images/sports/web_volleyball_3.jpg'
  }
}

// Helper function to format category display
const formatCategory = (sport: any): string => {
  const categories = []
  if (sport.supportsMen) categories.push('Men')
  if (sport.supportsWomen) categories.push('Women')
  if (sport.supportsMixed) categories.push('Mixed')
  
  if (categories.length === 1) {
    return `(For ${categories[0]})`
  } else if (categories.length === 2) {
    return `(For ${categories.join(' & ')})`
  } else if (categories.length === 3) {
    return '(For Men, Women & Mixed)'
  }
  
  return '(Category TBD)'
}

export default function SportPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const lang = params.lang as string
  const sportId = params.sportId as string

  // Fetch profile completion data for gender validation
  const profileDataQuery = api.profile.checkCompletion.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  )
  const userGender = profileDataQuery.data?.gender || user?.gender || null

  // Fetch sport data with gender validation
  const sportQuery = api.sports.getByIdOrName.useQuery(
    { 
      identifier: sportId, 
      userGender: userGender as 'M' | 'F' | 'O' | undefined 
    },
    { 
      enabled: !!sportId,
      // Refetch when user data changes to update gender validation
      refetchOnMount: true
    }
  )

  // Refetch sport data when profile data becomes available to update gender validation
  useEffect(() => {
    if (profileDataQuery.data?.gender && sportQuery.data) {
      sportQuery.refetch()
    }
  }, [profileDataQuery.data?.gender, sportQuery])

  if (sportQuery.isLoading) {
    return (
      <PageLoader
        title="Loading Sport Details..."
        variant="brand"
        size="lg"
      />
    )
  }

  if (sportQuery.error || !sportQuery.data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#4A2F1D] mb-2">Sport Not Found</h1>
          <p className="text-gray-600 mb-6">The sport you&apos;re looking for doesn&apos;t exist or isn&apos;t available.</p>
          <Link href={`/${lang}/public/sports`}>
            <Button variant="primary">Back to Sports</Button>
          </Link>
        </div>
      </main>
    )
  }

  const sport = sportQuery.data
  const images = getSportImages(sport.name)

  return (
    <main className="min-h-screen">
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        {/* Top Image Container: Stacks on mobile, becomes a background on desktop */}
        <div className="relative h-[50vh] md:absolute md:inset-0 md:h-full">
          {/* Mobile Background */}
          <Image
            src={images.mobile}
            alt={`${sport.name} Mobile Background`}
            fill
            className="object-cover md:hidden"
            priority
            quality={100}
          />

          {/* Desktop/Web Background */}
          <Image
            src={images.web}
            alt={`${sport.name} Background`}
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
                  {sport.name} at Isha Gramotsavam
                </h1>

                <div className="font-fira mb-6 text-xl font-semibold text-black md:text-2xl">
                  {formatCategory(sport)}
                </div>

                <p className="font-fira md:text-md mx-auto mb-8 max-w-3xl text-lg text-[#4A2F1D] md:mx-36">
                  Registration is free and mandatory.
                </p>

                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <RegistrationButton 
                    lang={lang} 
                    sport={sport.name.toLowerCase().replace(/\s+/g, '-')} 
                    sportId={sport.id}
                    size="lg" 
                    className="min-w-[200px]"
                    disabled={!sport.canRegister}
                    disabledMessage={sport.registrationMessage}
                  />
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

      {/* Prizes Section */}
      <section className="relative py-16 lg:py-24 bg-[url('/images/backgrounds/sports_background.png')]">
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
        <Container>
          <div className="text-center mb-12 z-1">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 font-fira z-10">
              Prizes
            </h2>
            <SectionDivider type="decorative" />
          </div>
          <PrizeDisplay />

          {/* Rules Section */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="bg-[#F3F0E5] rounded-2xl p-8 md:p-12 text-center">
              <h3 className="text-2xl md:text-3xl font-bold text-[#4A2F1D] mb-4 font-fira">
                Rules
              </h3>
              <p className="text-lg text-[#4A2F1D] mb-8 font-fira">
                Make sure you read through all the rules carefully.
              </p>
              <Link href={`/${lang}/public/sports/${sportId}/rules`}>
                <Button variant="secondary" size="lg" className="inline-flex items-center">
                  <svg viewBox="0 0 27 27" className="w-6 h-6 mr-3" fill="currentColor">
                    <g clipPath="url(#clip0_2085_23016)">
                      <path d="M24.3857 13.651L25.7181 12.9618L26.0745 13.651L25.7181 14.3401L24.3857 13.651ZM2.97527 13.6508L1.64293 14.34L1.2865 13.6508L1.64293 12.9617L2.97527 13.6508ZM23.0534 14.3401C20.6732 9.7383 17.0721 7.65725 13.6805 7.65723C10.2889 7.6572 6.68776 9.73819 4.3076 14.34L1.64293 12.9617C4.43068 7.57193 8.95084 4.65719 13.6805 4.65723C18.4102 4.65726 22.9303 7.57205 25.7181 12.9618L23.0534 14.3401ZM25.7181 14.3401C22.9303 19.7299 18.4102 22.6446 13.6805 22.6446C8.95083 22.6445 4.43067 19.7297 1.64293 14.34L4.3076 12.9617C6.68776 17.5635 10.2889 19.6445 13.6805 19.6446C17.0721 19.6446 20.6732 17.5636 23.0534 12.9618L25.7181 14.3401ZM11.9689 13.6508C11.9689 14.5961 12.7352 15.3624 13.6805 15.3624V18.3624C11.0784 18.3624 8.96893 16.253 8.96893 13.6508H11.9689ZM13.6805 15.3624C14.6258 15.3624 15.3921 14.5961 15.3921 13.6508H18.3921C18.3921 16.253 16.2826 18.3624 13.6805 18.3624V15.3624ZM15.3921 13.6508C15.3921 12.7056 14.6258 11.9393 13.6805 11.9393V8.93927C16.2826 8.93927 18.3921 11.0487 18.3921 13.6508H15.3921ZM13.6805 11.9393C12.7352 11.9393 11.9689 12.7056 11.9689 13.6508H8.96893C8.96893 11.0487 11.0784 8.93927 13.6805 8.93927V11.9393Z" fill="#C75026"></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_2085_23016">
                        <rect width="25.6926" height="25.6926" fill="white" transform="matrix(-1 0 0 1 26.5273 0.804688)" />
                      </clipPath>
                    </defs>
                  </svg>
                  View Rules
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-between mt-12 px-8">
            <DecorativeElement
              src="/images/backgrounds/grms_sports_bg_bottom_left_doll.png"
              alt="Dancing lady"
              size="xl"
              position="left"
              className='hidden md:block'
            />
            <DecorativeElement
              src="/images/backgrounds/grms_sports_bg_bottom_right_doll.png"
              alt="Dancing lady"
              size="xl"
              position="right"
              className='hidden md:block'
            />
          </div>
        </Container>
      </section>

      {/* Celebrity Testimonials */}
      <CelebrityTestimonials />

      {/* Transformation Stories */}
      <TransformationStories />

      {/* FAQ Section */}
      <FAQSection />

    </main>
  )
}