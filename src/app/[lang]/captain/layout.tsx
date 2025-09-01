"use client";

import { useState } from 'react';
import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';
import CaptainSidebar from '@/components/navigation/SimpleSidebar';
import { AuthenticatedMobileHeader } from '@/components/navigation/AuthenticatedMobileHeader';
import { usePageTitle } from '@/hooks/usePageTitle';

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
    <div className="md:min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <AuthenticatedMobileHeader
        title={pageTitle}
        onMenuToggle={() => setIsMobileSidebarOpen(true)}
        showBackButton={true}
      />

      <CaptainSidebar 
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        onDesktopToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      
      <div className={`${
        isDesktopSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      } transition-[margin] duration-300 ease-in-out`}>
        <main className="md:min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
