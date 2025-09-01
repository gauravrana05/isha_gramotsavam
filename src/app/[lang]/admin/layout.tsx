"use client";

import { useState } from 'react';
import { useRedirect } from '@/lib/utils/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';
import { AuthenticatedMobileHeader } from '@/components/navigation/AuthenticatedMobileHeader';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pageTitle = usePageTitle();
  useRedirect(['admin']);
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <PageLoader 
        title="Loading Admin Panel..."
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

      <AdminSidebar 
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
