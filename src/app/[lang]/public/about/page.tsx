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
        <main className="min-h-screen">
            {/* Hero Section */}
            <section className="py-16 bg-[#F3F0E5]">
                <Container>
                    <div className="text-center">
                        <h1 className="text-4xl md:text-6xl font-bold text-[#4A2F1D] mb-4 font-fira">
                            About Us
                        </h1>
                    </div>
                </Container>
            </section>

            {/* The Beginning Section */}
            <section className="py-16 lg:py-24">
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
                            <p className="text-[#4A2F1D] leading-relaxed font-fira text-lg mb-6">
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

            {/* Impact Section */}
            <section className="py-16 lg:py-24 bg-[url('/images/backgrounds/sports_background.png')] relative">
                <div className="absolute inset-0 bg-[#F28C38]/90"></div>
                <Container className="relative z-10">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 font-fira">
                            Impact
                        </h2>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                        <div className="text-center text-white">
                            <h3 className="text-3xl md:text-4xl font-bold mb-2 font-fira">2,02,000+</h3>
                            <p className="text-lg font-fira">Players</p>
                        </div>
                        <div className="text-center text-white">
                            <h3 className="text-3xl md:text-4xl font-bold mb-2 font-fira">17,000+</h3>
                            <p className="text-lg font-fira">Teams</p>
                        </div>
                        <div className="text-center text-white">
                            <h3 className="text-3xl md:text-4xl font-bold mb-2 font-fira">30,000+</h3>
                            <p className="text-lg font-fira">Villages</p>
                        </div>
                        <div className="text-center text-white">
                            <h3 className="text-3xl md:text-4xl font-bold mb-2 font-fira">38,600+</h3>
                            <p className="text-lg font-fira">Women Players</p>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Awards & Recognition Section */}
            <section className="py-16 lg:py-24">
                <Container>
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-8 font-fira">
                            Awards & Recognition
                        </h2>
                        <SectionDivider type="decorative" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                        <div className="text-center">
                            <div className="mb-6">
                                <div className="w-32 h-32 mx-auto bg-[#F3F0E5] rounded-full flex items-center justify-center">
                                    <span className="text-4xl">🏆</span>
                                </div>
                            </div>
                            <p className="text-[#4A2F1D] font-fira text-lg">
                                Awarded Government of India's Rashtriya Khel Protsahan Puraskar in 2018
                            </p>
                        </div>
                        
                        <div className="text-center">
                            <div className="mb-6">
                                <div className="w-32 h-32 mx-auto bg-[#F3F0E5] rounded-full flex items-center justify-center">
                                    <span className="text-4xl">🤝</span>
                                </div>
                            </div>
                            <p className="text-[#4A2F1D] font-fira text-lg">
                                Partnered with UNICEF for the 2018 edition
                            </p>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Get Involved Section */}
            <section className="py-16 lg:py-24 bg-[#F3F0E5]">
                <Container>
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-8 font-fira">
                            Get Involved
                        </h2>
                        <SectionDivider type="decorative" />
                    </div>
                    
                    <div className="max-w-2xl mx-auto text-center">
                        <p className="text-[#4A2F1D] leading-relaxed font-fira text-lg mb-8">
                            Support us in continuing this unique initiative that is transforming the rural community.
                        </p>
                        
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl p-8 shadow-lg">
                                <h3 className="text-2xl font-bold text-[#4A2F1D] mb-4 font-fira">Partner With Us</h3>
                                <p className="text-[#4A2F1D] mb-6 font-fira">
                                    Support us in transforming the lives of the rural community
                                </p>
                                <p className="text-[#4A2F1D] font-fira">
                                    Get in touch with us at:{' '}
                                    <a 
                                        href="mailto:ishagramotsavam@ishaoutreach.org"
                                        className="text-[#F28C38] hover:underline"
                                    >
                                        ishagramotsavam@ishaoutreach.org
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Contact Us Section */}
            <section className="py-16 lg:py-24">
                <Container>
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-8 font-fira">
                            Contact Us
                        </h2>
                    </div>
                    
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xl font-bold text-[#4A2F1D] mb-4 font-fira">Phone</h3>
                                <p className="text-[#4A2F1D] font-fira text-lg">+91 83000 30999</p>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[#4A2F1D] mb-4 font-fira">Email</h3>
                                <p className="text-[#4A2F1D] font-fira text-lg">
                                    <a 
                                        href="mailto:ishagramotsavam@ishaoutreach.org"
                                        className="text-[#F28C38] hover:underline"
                                    >
                                        ishagramotsavam@ishaoutreach.org
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>
        </main>
    )
}