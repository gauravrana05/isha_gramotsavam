// src/components/ui/StatCard.tsx
import React from 'react'

interface StatCardProps {
  number?: string;
  label?: string;
  title?: string;
  value?: number;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  number,
  label,
  title,
  value,
  icon,
  className = "",
  onClick
}) => {
  const displayTitle = title || label;
  const displayValue = value !== undefined ? value.toString() : number;

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 font-fira">{displayTitle}</p>
          <p className="text-2xl font-bold text-gray-900 font-fira">{displayValue || '0'}</p>
        </div>
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;