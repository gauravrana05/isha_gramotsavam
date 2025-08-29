"use client";

import { useState } from 'react';
import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';
import VerificationSidebar from '@/components/navigation/VerificationSidebar';

import { api } from '@/server/trpc/react';
import { useRouter, useParams } from 'next/navigation';

export default function VerificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
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
    <div className="lg:min-h-screen bg-gray-50">
      <VerificationSidebar 
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        onDesktopToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
      />
      <div className={`flex flex-col lg:min-h-screen ${
        isDesktopSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-80'
      } transition-[margin] duration-300 ease-in-out`}>
        <div className="lg:hidden h-16"></div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}