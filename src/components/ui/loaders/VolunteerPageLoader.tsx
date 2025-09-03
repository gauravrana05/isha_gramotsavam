import React from 'react';

export interface VolunteerPageLoaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

const VolunteerPageLoader: React.FC<VolunteerPageLoaderProps> = ({
  title,
  subtitle,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-[#F3F0E5] flex items-center justify-center ${className}`}>
      <div className="text-center">
        {/* Custom Volunteer Spinner */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C38] mx-auto mb-4"></div>
        
        {/* Title */}
        {title && (
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            {title}
          </h2>
        )}
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-gray-600">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default VolunteerPageLoader;
