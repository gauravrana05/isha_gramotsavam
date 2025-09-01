"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/utils/i18n';
import { 
  BookOpen, 
  X, 
  ChevronRight,
  Clock,
  Play,
  Flag,
  AlertTriangle,
  Phone
} from 'lucide-react';

interface QuickGuideButtonProps {
  venueId: string;
  className?: string;
}

export default function QuickGuideButton({ venueId, className = '' }: QuickGuideButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { lang } = useParams();
  const { t } = useTranslation();

  const quickSections = [
    {
      id: 'pre-match',
      titleKey: 'volunteer.guide.preMatch.title',
      icon: <Clock className="w-4 h-4" />,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'during-match', 
      titleKey: 'volunteer.guide.duringMatch.title',
      icon: <Play className="w-4 h-4" />,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      id: 'post-match',
      titleKey: 'volunteer.guide.postMatch.title', 
      icon: <Flag className="w-4 h-4" />,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      id: 'emergency',
      titleKey: 'volunteer.guide.emergency.title',
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'bg-red-500 hover:bg-red-600'
    }
  ];

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Overlay */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Expanded Menu */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-xl border p-4 w-80 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              {t('volunteer.guide.quickAccess', 'Quick Guide Access')}
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="space-y-2">
            {quickSections.map((section) => (
              <Link
                key={section.id}
                href={`/${lang}/volunteer/venues/${venueId}/guide#${section.id}`}
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
              >
                <div className={`p-2 rounded-lg text-white ${section.color} group-hover:scale-105 transition-transform`}>
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {t(section.titleKey)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </Link>
            ))}

            {/* Full Guide Link */}
            <Link
              href={`/${lang}/volunteer/venues/${venueId}/guide`}
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-3 p-3 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors group border border-orange-200 mt-3"
            >
              <div className="p-2 bg-orange-500 rounded-lg text-white group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-900">
                  {t('volunteer.guide.fullGuide', 'Complete Match Day Guide')}
                </p>
                <p className="text-xs text-orange-700">
                  {t('volunteer.guide.fullGuideDesc', 'Step-by-step instructions')}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-600 group-hover:text-orange-800 transition-colors" />
            </Link>
          </div>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${
          isExpanded 
            ? 'rotate-45 scale-110' 
            : 'hover:scale-105 animate-pulse'
        }`}
        aria-label={t('volunteer.guide.openGuide', 'Open Volunteer Guide')}
      >
        {isExpanded ? (
          <X className="w-6 h-6" />
        ) : (
          <BookOpen className="w-6 h-6" />
        )}
      </button>

      {/* Pulsing indicator for new users */}
      {!isExpanded && (
        <div className="absolute inset-0 rounded-full bg-orange-400 opacity-20 animate-ping"></div>
      )}
    </div>
  );
}

// Hook to show/hide the button based on user role and location
export function useShowQuickGuide() {
  // This can be enhanced to show the button only for volunteers in venue contexts
  return true;
}