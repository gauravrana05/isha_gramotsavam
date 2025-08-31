"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRedirect } from '@/lib/utils/navigation';
import VolunteerSidebar from '@/components/volunteer/VolunteerSidebar';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import { PageLoader } from '@/components/ui/loaders';
import { LanguageCode } from '@/lib/utils/i18n-server';

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRedirect(['general_volunteer', 'technical_volunteer', 'verification_volunteer']);
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { lang } = useParams();
  const { t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };


  if (loading || !user) {
    return (
      <PageLoader 
        title={t('volunteer.loading_dashboard', 'Loading Volunteer Dashboard...')}
        variant="brand"
        size="lg"
      />
    );
  }

  return (
    <>
      <div className="lg:min-h-screen bg-gray-50 flex">
        <VolunteerSidebar 
          isDesktopCollapsed={isSidebarCollapsed}
          onDesktopToggle={toggleSidebar}
        />
        <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}>
          <div className="lg:hidden h-16"></div>
          <main className="flex-1 relative">
            {children}
          </main>
        </div>
      </div>

    </>
  );
}
