// src/components/ui/SportCard.tsx
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Button from './Button'

interface SportCardProps {
  id: string;
  name: string;
  category: string;
  players: string;
  prize: string;
  image: string;
  registrationLink: string;
  learnMoreLink: string;
  note?: string;
}

export const SportCard: React.FC<SportCardProps> = ({
  id,
  name,
  category,
  players,
  prize,
  image,
  registrationLink,
  learnMoreLink,
  note
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
      {/* Sport Image */}
      <div className="relative h-64">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Sport Content */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-[#4A2F1D] mb-2 font-fira">
          {name}
        </h3>

        {note && (
          <p className="text-[#C79016] font-medium text-sm mb-2 font-fira">
            {note}
          </p>
        )}

        <div className="mb-4">
          <p className="text-[#F28C38] font-semibold text-lg mb-2 font-fira">
            <span className="text-[#C79016] bg-transparent">{category}</span> | {players}
          </p>
          <p className="text-2xl font-bold text-[#4A2F1D] mb-1 font-fira">
            Winning Prize: {prize}
          </p>
        </div>

        <p className="text-gray-600 mb-6 font-fira">
          Registration is free & mandatory
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={registrationLink} className="flex-1">
            <Button variant="primary" className="w-full">
              Register Now
            </Button>
          </Link>
          <Link href={learnMoreLink} className="flex-1">
            <Button variant="secondary" className="w-full">
              Learn More
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SportCard;