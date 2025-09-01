"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthenticatedMobileHeader } from '@/components/navigation/AuthenticatedMobileHeader';
import { usePageTitle } from '@/hooks/usePageTitle';
import VolunteerSidebar from '@/components/volunteer/VolunteerSidebar';

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pageTitle = usePageTitle();
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${lang}/auth/login`);
    }
  }, [user, loading, router, lang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C38]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="md:min-h-screen bg-[#F3F0E5]">
      {/* Mobile Header */}
      <AuthenticatedMobileHeader
        title={pageTitle}
        onMenuToggle={() => setIsMobileSidebarOpen(true)}
        showBackButton={true}
      />

      <VolunteerSidebar 
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        onDesktopToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      
      <div className={`flex flex-col md:min-h-screen ${
        isDesktopSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      } transition-[margin] duration-300 ease-in-out`}>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
