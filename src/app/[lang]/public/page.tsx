// src/app/[lang]/public/page.tsx
import React from 'react'
import HeroSection from '@/components/public/HeroSection'
import QuoteSection from '@/components/public/QuoteSection'
import VideoSection from '@/components/public/VideoSection'
import GallerySection from '@/components/public/GallerySection'
import VisionSection from '@/components/public/VisionSection'
import KeyComponents from '@/components/public/KeyComponents'
import ImpactSection from '@/components/public/ImpactSection'
import CelebrityTestimonials from '@/components/public/CelebrityTestimonials'
import SportsPreview from '@/components/public/SportsPreview'
import TransformationStories from '@/components/public/TransformationStories'
import CulturalEvents from '@/components/public/CulturalEvents'
import AwardsRecognition from '@/components/public/AwardsRecognition'
import FAQSection from '@/components/public/FAQSection'

interface PublicPageProps {
  params: Promise<{
    lang: string
  }>
}

export default async function PublicPage({ params }: PublicPageProps) {
  const { lang } = await params;

  return (
    <main className="min-h-screen"> 
      {/* Hero Section with improved background and layout */}
      <HeroSection lang={lang} />
      
      {/* Quote Section with decorative elements and proper transitions */}
      <QuoteSection />
      
      {/* Vision Section with proper background and styling */}
      <VisionSection />
      
      {/* Key Components Section */}
      <KeyComponents />
      
      {/* Celebrity Testimonials */}
      <CelebrityTestimonials />
      
      {/* Sports Preview with carousel */}
      <SportsPreview lang={lang} />
      
      {/* Tales of Transformation */}
      <TransformationStories />
      
      {/* Cultural Events */}
      {/* <CulturalEvents lang={lang} /> */}
      
      {/* Awards & Recognition */}
      {/* <AwardsRecognition /> */}
      
      {/* FAQ Section */}
      <FAQSection />
      
    </main>
  )
}