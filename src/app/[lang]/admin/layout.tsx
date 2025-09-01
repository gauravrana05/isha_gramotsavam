"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRedirect } from '@/lib/utils/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';
import { AuthenticatedMobileHeader } from '@/components/navigation/AuthenticatedMobileHeader';
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pageTitle = usePageTitle();
  const router = useRouter();
  const params = useParams();
  const lang = params.lang as string;
  
  useRedirect(['admin']);
  const { user, userProfile, loading } = useAuth();

  // Enhanced admin role verification
  useEffect(() => {
    if (!loading && user) {
      if (userProfile?.role !== 'admin') {
        console.warn(`Unauthorized admin access attempt by user ${user.id} with role ${userProfile?.role}`);
        router.push(`/${lang}/public`);
        return;
      }
    }
  }, [user, userProfile, loading, router, lang]);

  if (loading || !user) {
    return (
      <PageLoader 
        title="Loading Admin Panel..."
        variant="brand"
        size="lg"
      />
    );
  }

  // Double-check admin role before rendering
  if (userProfile?.role !== 'admin') {
    return null; // Prevent flash of admin content
  }

  return (
    <AdminErrorBoundary>
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
          isDesktopSidebarCollapsed ? 'md:ml-16' : 'md:ml-[280px]'
        } transition-[margin] duration-300 ease-in-out`}>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminErrorBoundary>
  );
}
