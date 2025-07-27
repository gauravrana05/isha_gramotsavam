// src/components/ui/SectionDivider.tsx
import React from 'react'
import Image from 'next/image'

interface SectionDividerProps {
  type?: "wave" | "decorative" | "simple";
  className?: string;
}

export const SectionDivider: React.FC<SectionDividerProps> = ({
  type = "decorative",
  className = ""
}) => {
  if (type === "wave") {
    return (
      <div className={`relative ${className}`}>
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-12 md:h-16"
          fill="#F28C38"
        >
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
        </svg>
      </div>
    );
  }

  if (type === "decorative") {
    return (
      <div className={`flex justify-center my-8 ${className}`}>
        <Image
          src="/images/icons/public_decorator_4.png"
          alt="Decorative divider"
          width={240}
          height={80}
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`flex justify-center my-8 ${className}`}>
      <div className="w-24 h-1 bg-[#F28C38] rounded-full"></div>
    </div>
  );
};

export default SectionDivider;