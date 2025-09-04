"use client";

import { useState } from 'react';
import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { PageLoader } from '@/components/ui/loaders';
import PlayerSidebar from '@/components/navigation/PlayerSidebar';
import { AuthenticatedMobileHeader } from '@/components/navigation/AuthenticatedMobileHeader';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PlayerOfflineProvider } from '@/context/PlayerOfflineContext';
import { PlayerOfflineIndicator } from '@/components/player/PlayerOfflineIndicator';
import { MobilePlayerInterface } from '@/components/mobile/player/MobilePlayerInterface';

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pageTitle = usePageTitle();
  const { isMobile, isLoading: mobileLoading } = useMobileDetection();
  useRedirect(['player']);
  const { user, loading } = useAuth();

  if (loading || !user || mobileLoading) {
    return (
      <PageLoader 
        title="Loading Player Dashboard..."
        variant="brand"
        size="lg"
      />
    );
  }

  return (
    <PlayerOfflineProvider>
      {isMobile ? (
        // Mobile Interface
        <MobilePlayerInterface />
      ) : (
        // Desktop Interface (existing)
        <div className="md:min-h-screen bg-gray-50">
          {/* Offline indicator */}
          <PlayerOfflineIndicator />
          
          {/* Mobile header */}
          <div className="md:hidden">
            <AuthenticatedMobileHeader
              title={pageTitle}
              onMenuClick={() => setIsMobileSidebarOpen(true)}
            />
          </div>

          <div className="flex h-screen pt-16 md:pt-0">
            {/* Sidebar */}
            <PlayerSidebar
              isDesktopCollapsed={isDesktopSidebarCollapsed}
              isMobileOpen={isMobileSidebarOpen}
              onDesktopToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
              onMobileClose={() => setIsMobileSidebarOpen(false)}
            />

            {/* Main content */}
            <div className="flex-1 overflow-auto">
              <main className="h-full">
                {children}
              </main>
            </div>
          </div>
        </div>
      )}
    </PlayerOfflineProvider>
  );
}
