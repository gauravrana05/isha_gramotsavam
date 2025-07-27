// src/components/public/AwardsRecognition.tsx
'use client'

import React from 'react'
import Image from 'next/image'
import Container from '../ui/Container'
import SectionDivider from '../ui/SectionDivider'
import Carousel from '../ui/Carousel'

export default function AwardsRecognition() {
  const awards = [
    {
      id: 1,
      image: "/images/awards/rashtriya_khel_protsahan_puraskar.png",
      title: "Awarded Government of India's Rashtriya Khel Protsahan Puraskar in 2018",
      description: "Recognition for outstanding contribution to sports promotion"
    },
    {
      id: 2,
      image: "/images/awards/unicef_partnership.jpg",
      title: "Partnered with UNICEF for the 2018 edition",
      description: "Collaboration with UNICEF to promote sports among children"
    }
  ];

  const awardCards = awards.map((award) => (
    <div key={award.id} className="text-center p-6">
      <div className="relative h-32 mb-6 flex items-center justify-center">
        <Image
          src={award.image}
          alt={award.title}
          width={150}
          height={120}
          className="object-contain"
        />
      </div>
      <h3 className="text-lg font-semibold text-[#4A2F1D] mb-2 font-fira">
        {award.title}
      </h3>
      <p className="text-gray-600 text-sm font-fira">
        {award.description}
      </p>
    </div>
  ));

  return (
    <section className="bg-[#F3F0E5] py-16 lg:py-24">
      <Container>
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-8 font-fira">
            Awards & Recognition
          </h2>
          <SectionDivider type="decorative" className="my-8" />
        </div>

        {/* Awards Carousel */}
        <div className="max-w-4xl mx-auto">
          <Carousel
            itemsPerView={{
              mobile: 1,
              tablet: 2,
              desktop: 2
            }}
            showArrows={true}
            showDots={true}
            autoPlay={true}
            autoPlayInterval={5000}
          >
            {awardCards}
          </Carousel>
        </div>
      </Container>
    </section>
  )
}