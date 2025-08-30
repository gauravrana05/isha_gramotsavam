"use client";

import { useState } from 'react';
import { useRedirect } from '@/lib/utils/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
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
    <div className="lg:min-h-screen bg-gray-50">
      <AdminSidebar 
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        onDesktopToggle={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
      />
      <div className={`flex flex-col lg:min-h-screen ${
        isDesktopSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      } transition-[margin] duration-300 ease-in-out`}>
        <div className="lg:hidden h-16"></div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
