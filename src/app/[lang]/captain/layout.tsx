"use client";

import { useState } from 'react';
import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { PageLoader } from '@/components/ui/loaders';
import CaptainSidebar from '@/components/navigation/SimpleSidebar';
import { AuthenticatedMobileHeader } from '@/components/navigation/AuthenticatedMobileHeader';
import { usePageTitle } from '@/hooks/usePageTitle';
import { CaptainOfflineProvider } from '@/context/CaptainOfflineContext';
import { CaptainOfflineIndicator } from '@/components/captain/CaptainOfflineIndicator';
import { MobileCaptainInterface } from '@/components/mobile/captain/MobileCaptainInterface';

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pageTitle = usePageTitle();
  const { isMobile, isLoading: mobileLoading } = useMobileDetection();
  useRedirect(['captain']);
  const { user, loading } = useAuth();

  if (loading || !user || mobileLoading) {
    return (
      <PageLoader 
        title="Loading Captain Dashboard..."
        variant="brand"
        size="lg"
      />
    );
  }

  return (
    <CaptainOfflineProvider>
      {isMobile ? (
        // Mobile Interface
        <MobileCaptainInterface />
      ) : (
        // Desktop Interface (existing)
        <div className="md:min-h-screen bg-gray-50">
          {/* Offline indicator */}
          <CaptainOfflineIndicator />
          
          {/* Mobile header */}
          <AuthenticatedMobileHeader
            title={pageTitle}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
          />

          <CaptainSidebar
            isDesktopCollapsed={isDesktopSidebarCollapsed}
            isMobileOpen={isMobileSidebarOpen}
            onDesktopToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            onMobileClose={() => setIsMobileSidebarOpen(false)}
          />
          
          <div className={`flex flex-col md:min-h-screen ${
            isDesktopSidebarCollapsed ? 'md:ml-16' : 'md:ml-[280px]'
          } transition-[margin] duration-300 ease-in-out`}>
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      )}
    </CaptainOfflineProvider>
  );
}
