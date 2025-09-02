"use client";

import { useState } from 'react';
import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';
import CaptainSidebar from '@/components/navigation/SimpleSidebar';
import { AuthenticatedMobileHeader } from '@/components/navigation/AuthenticatedMobileHeader';
import { usePageTitle } from '@/hooks/usePageTitle';
import { CaptainOfflineProvider } from '@/context/CaptainOfflineContext';
import { CaptainOfflineIndicator } from '@/components/captain/CaptainOfflineIndicator';

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pageTitle = usePageTitle();
  useRedirect(['captain']);
  const { user, loading } = useAuth();

  if (loading || !user) {
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
    </CaptainOfflineProvider>
  );
}
