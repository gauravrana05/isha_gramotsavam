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
    <div className="lg:min-h-screen bg-gray-50">
      <CaptainSidebar 
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        onDesktopToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
      />
      <div className={`${
        isDesktopSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } transition-[margin] duration-300 ease-in-out`}>
        <div className="lg:hidden h-16"></div>
        <main className="lg:min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
