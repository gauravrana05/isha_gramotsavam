"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { AuthenticatedMobileHeader } from '@/components/navigation/AuthenticatedMobileHeader';
import { usePageTitle } from '@/hooks/usePageTitle';
import VolunteerSidebar from '@/components/volunteer/VolunteerSidebar';
import VolunteerHelpBot from '@/components/volunteer/VolunteerHelpBot';
import { OfflineContextWrapper } from '@/context/OfflineContextWrapper';
import { VolunteerPageLoader } from '@/components/ui';

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pageTitle = usePageTitle();
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useParams();
  const { user, userProfile, loading } = useAuth();
  const { isLoading: languageLoading } = useLanguage();

  // Check if we're on the volunteer homepage
  const isVolunteerHomepage = pathname === `/${lang}/volunteer`;

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${lang}/auth/login`);
    }
  }, [user, loading, router, lang]);

  if (loading || languageLoading) {
    return <VolunteerPageLoader />;
  }

  if (!user) {
    return null;
  }

  return (
    <OfflineContextWrapper>
      <div className="md:min-h-screen bg-[#F3F0E5]">
        {/* Mobile Header */}
        <AuthenticatedMobileHeader
          title={pageTitle}
          onMenuToggle={() => setIsMobileSidebarOpen(true)}
          showBackButton={true}
        />

        {/* Only show sidebar if not on volunteer homepage */}
        {!isVolunteerHomepage && (
          <VolunteerSidebar 
            isDesktopCollapsed={isDesktopSidebarCollapsed}
            onDesktopToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={() => setIsMobileSidebarOpen(false)}
          />
        )}
        
        <div className={`flex flex-col md:min-h-screen ${
          !isVolunteerHomepage 
            ? (isDesktopSidebarCollapsed ? 'md:ml-16' : 'md:ml-[280px]') 
            : ''
        } transition-[margin] duration-300 ease-in-out`}>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        
        {/* Help Chatbot - Always available */}
        <VolunteerHelpBot />
      </div>
    </OfflineContextWrapper>
  );
}
