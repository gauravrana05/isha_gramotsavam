"use client";

import { useState } from 'react';
import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';
import VerificationSidebar from '@/components/navigation/VerificationSidebar';
import { AuthenticatedMobileHeader } from '@/components/navigation/AuthenticatedMobileHeader';
import { usePageTitle } from '@/hooks/usePageTitle';

import { api } from '@/server/trpc/react';
import { useRouter, useParams } from 'next/navigation';

export default function VerificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pageTitle = usePageTitle();
  const router = useRouter();
  const { lang } = useParams();

  const { data: userProfile, isLoading, error } = api.users.getVerificationProfile.useQuery();

  if (isLoading) {
    return (
      <PageLoader 
        title="Loading Verification Dashboard..."
        variant="brand"
        size="lg"
      />
    );
  }

  if (error || !userProfile) {
    // Redirect to login or an error page if not authorized or user profile not found
    router.push(`/${lang}/login`); // Or a more specific error page
    return null; 
  }

  return (
    <div className="md:min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <AuthenticatedMobileHeader
        title={pageTitle}
        onMenuToggle={() => setIsMobileSidebarOpen(true)}
        showBackButton={true}
      />

      <VerificationSidebar 
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