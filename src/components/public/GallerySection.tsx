// src/components/public/GallerySection.tsx
'use client'

import React from 'react'
import Image from 'next/image'
import Container from '../ui/Container'
import Carousel from '../ui/Carousel'

export default function GallerySection() {
  const galleryImages = [
    {
      src: "/images/gramotsavam/gallery_1.jpg",
      alt: "Gramotsavam 2024 - Image 1"
    },
    {
      src: "/images/gramotsavam/gallery_2.jpg",
      alt: "Gramotsavam 2024 - Image 2"
    },
    {
      src: "/images/gramotsavam/gallery_3.jpg",
      alt: "Gramotsavam 2024 - Image 3"
    },
    {
      src: "/images/gramotsavam/gallery_4.jpg",
      alt: "Gramotsavam 2024 - Image 4"
    },
    {
      src: "/images/gramotsavam/gallery_5.jpg",
      alt: "Gramotsavam 2024 - Image 5"
    },
    {
      src: "/images/gramotsavam/gallery_6.jpg",
      alt: "Gramotsavam 2024 - Image 6"
    }
  ]

  const galleryItems = galleryImages.map((image, index) => (
    <div key={index} className="relative aspect-[4/3] overflow-hidden rounded-lg group">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        className="object-cover hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
    </div>
  ));

  return (
    <section className="bg-white py-16 lg:py-24">
      <Container>
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#4A2F1D] mb-8 font-fira">
            #Gramotsavam 2024
          </h2>
        </div>

        {/* Gallery Carousel */}
        <Carousel
          itemsPerView={{
            mobile: 1,
            tablet: 2,
            desktop: 3
          }}
          showArrows={true}
          showDots={true}
          autoPlay={true}
          autoPlayInterval={4000}
          className="px-4"
        >
          {galleryItems}
        </Carousel>
      </Container>
    </section>
  )
}