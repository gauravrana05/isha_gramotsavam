"use client";

import { useState } from 'react';
import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';
import CaptainSidebar from '@/components/navigation/SimpleSidebar';

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
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
    <div className="min-h-screen bg-gray-50">
      <CaptainSidebar 
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        onDesktopToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
      />
      <div className={`flex flex-col min-h-screen ${
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
