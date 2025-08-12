// src/app/[lang]/public/about/page.tsx
import React from 'react'
import Container from '@/components/ui/Container'
import SectionDivider from '@/components/ui/SectionDivider'

interface AboutPageProps {
    params: Promise<{
        lang: string
    }>
}

export default async function AboutPage({ params }: AboutPageProps) {
    const { lang } = await params

    return (
        <main className="min-h-screen bg-[url('/images/backgrounds/rules_background.jpg')]">
            {/* Hero Section */}
            <section className="py-16 bg-[#F3F0E5]">
                <Container>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold text-[#4A2F1D] mb-2 font-fira">
                            About Us
                        </h1>
                    </div>
                </Container>
            </section>

            {/* The Beginning Section */}
            <section className="pt-8 lg:pt-16">
                <Container>
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-3xl font-bold text-[#4A2F1D] mb-2 font-fira">
                            The
                        </h2>
                        <h2 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-8 font-fira">
                            Beginning
                        </h2>
                    </div>
                    
                    <div className="max-w-4xl mx-auto">
                        <div className="prose prose-lg max-w-none">
                            <p className="text-[#4A2F1D] leading-relaxed font-fira text-lg mb-6 text-justified">
                                Back in 2003, Sadhguru was traversing Tamil Nadu, going from village to village conducting Yoga programs. These three-day programs culminated with people coming together to play games, sowing the seeds for Isha Gramotsavam to bear fruit. The first Gramotsavam was held in 2004 in Gobichettipalayam, Tamil Nadu, and saw about 140 teams from various villages playing in front of 50,000 spectators.
                            </p>
                            
                            <p className="text-[#4A2F1D] leading-relaxed font-fira text-lg">
                                It is a living, thriving model of how sports can transform individuals and communities by creating the necessary ambience for men, women, and children of all ages to come out and play on a daily basis. This has helped break down barriers of caste, creed, and gender, assist youth to overcome addictions, and provide a platform for women who have never played since their childhood to experience the joy of playing a game.
                            </p>
                        </div>
                    </div>
                    
                    <div className="text-center mt-12">
                        <SectionDivider type="decorative" />
                    </div>
                </Container>
            </section>

            {/* Vision Section */}
            <section className="py-16 lg:py-24 bg-[#F3F0E5]">
                <Container>
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-8 font-fira">
                            Vision
                        </h2>
                    </div>
                    
                    <div className="max-w-4xl mx-auto">
                        <div className="prose prose-lg max-w-none">
                            <p className="text-[#4A2F1D] leading-relaxed font-fira text-lg mb-6">
                                Over 60% of rural India is of working age, yet it faces challenges due to unviable agriculture and non-inclusive growth. The rural youth find themselves engulfed by abject poverty and succumb to addictions. Isha Gramotsavam is an endeavor to rekindle the rural spirit and bring back the celebratory mode in the rural community.
                            </p>
                            
                            <p className="text-[#4A2F1D] leading-relaxed font-fira text-lg">
                                Through sports and an elaborate display of rural culture, Isha Gramotsavam has become an effective tool to transform society by helping villagers stay away from addictions, breaking caste barriers, empowering women, and reviving the resilient rural spirit.
                            </p>
                        </div>
                    </div>
                </Container>
            </section>
        </main>
    )
}