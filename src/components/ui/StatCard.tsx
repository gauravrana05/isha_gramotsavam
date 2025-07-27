// src/components/ui/StatCard.tsx
import React from 'react'

interface StatCardProps {
  number: string;
  label: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  number,
  label,
  className = ""
}) => {
  return (
    <div className={`text-center ${className}`}>
      <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#F28C38] mb-2 font-fira">
        {number}
      </div>
      <div className="text-xl md:text-2xl font-semibold text-[#4A2F1D] font-fira">
        {label}
      </div>
    </div>
  );
};

export default StatCard;