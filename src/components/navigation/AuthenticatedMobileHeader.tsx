'use client';

import { ArrowLeft, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/component-patterns';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';

interface AuthenticatedMobileHeaderProps {
  title: string;
  onMenuToggle: () => void;
  className?: string;
  showBackButton?: boolean;
  backHref?: string;
}

export const AuthenticatedMobileHeader: React.FC<AuthenticatedMobileHeaderProps> = ({
  title,
  onMenuToggle,
  className = '',
  showBackButton = true,
  backHref
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      // Fallback to dashboard based on current path
      const currentPath = window.location.pathname;
      const currentLang = currentPath.split('/')[1] || 'en';
      
      if (currentPath.includes('/admin/')) {
        router.push(`/${currentLang}/admin/dashboard`);
      } else if (currentPath.includes('/captain/')) {
        router.push(`/${currentLang}/captain/dashboard`);
      } else if (currentPath.includes('/player/')) {
        router.push(`/${currentLang}/player/dashboard`);
      } else if (currentPath.includes('/volunteer/')) {
        // For volunteers, redirect to volunteer homepage
        router.push(`/${currentLang}/volunteer`);
      } else if (currentPath.includes('/verification/')) {
        router.push(`/${currentLang}/verification/dashboard`);
      } else {
        router.push(`/${currentLang}/dashboard`);
      }
    }
  };

  return (
    <header className={cn(
      "md:hidden h-16 bg-white border-b border-gray-200 shadow-sm font-fira",
      className
    )}>
      <div className="flex items-center justify-between h-full px-4">
        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={handleBack}
            className="flex items-center p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors min-w-[44px] min-h-[44px]"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="text-xs font-medium hidden xs:inline">Back</span>
          </button>
        )}

        {/* Page Title */}
        <h1 className="text-sm font-medium text-gray-900 truncate mx-4 flex-1 text-center">
          {title}
        </h1>

        {/* Menu Button */}
        <button
          onClick={onMenuToggle}
          className="flex items-center justify-center p-2 -mr-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors min-w-[44px] min-h-[44px]"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};