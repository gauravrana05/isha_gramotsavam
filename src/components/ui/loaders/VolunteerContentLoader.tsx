import React from 'react';

export interface VolunteerContentLoaderProps {
  title?: string;
  subtitle?: string;
  showStats?: boolean;
  statsCount?: number;
  showTable?: boolean;
  showCards?: boolean;
  cardsCount?: number;
  className?: string;
}

const VolunteerContentLoader: React.FC<VolunteerContentLoaderProps> = ({
  title = "Loading...",
  subtitle = "Please wait while we load your data",
  showStats = false,
  statsCount = 4,
  showTable = false,
  showCards = false,
  cardsCount = 3,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-[#F3F0E5] py-4 sm:py-8 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Loading Header Skeleton */}
        <div className="mb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>

        {/* Loading Stats Cards Skeleton */}
        {showStats && (
          <div className={`grid grid-cols-2 lg:grid-cols-${Math.min(statsCount, 4)} gap-4 mb-8`}>
            {[...Array(statsCount)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-4 shadow-sm">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-12"></div>
                    </div>
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading Cards Grid */}
        {showCards && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(cardsCount)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6 shadow-sm">
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading Table */}
        {showTable && (
          <div className="bg-white rounded-lg border shadow-sm mb-8">
            <div className="p-6">
              <div className="animate-pulse">
                {/* Table header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="h-5 bg-gray-200 rounded w-32"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
                
                {/* Table rows */}
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 py-2">
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                      <div className="w-20 h-4 bg-gray-200 rounded"></div>
                      <div className="w-16 h-4 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Main Content */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F28C38] mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolunteerContentLoader;