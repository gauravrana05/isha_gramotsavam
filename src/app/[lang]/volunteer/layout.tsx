"use client";

import { useState } from 'react';
import { useRedirect } from '@/lib/utils/navigation';
import VolunteerSidebar from '@/components/volunteer/VolunteerSidebar';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRedirect(['general_volunteer', 'technical_volunteer', 'verification_volunteer']);
  const { user, loading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  if (loading || !user) {
    return (
      <PageLoader 
        title="Loading Volunteer Dashboard..."
        variant="brand"
        size="lg"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <VolunteerSidebar 
        isDesktopCollapsed={isSidebarCollapsed}
        onDesktopToggle={toggleSidebar}
      />
      <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-80'
      }`}>
        <div className="lg:hidden h-16"></div>
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
