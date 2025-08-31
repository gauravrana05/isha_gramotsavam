"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRedirect } from '@/lib/utils/navigation';
import VolunteerSidebar from '@/components/volunteer/VolunteerSidebar';
import LanguageSelectionModal from '@/components/volunteer/LanguageSelectionModal';
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
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Language preference detection logic
  useEffect(() => {
    if (loading || !user || !userProfile) return;

    // Check if user has a language preference
    if (!userProfile.languagePreference) {
      // Show language selection modal if no preference is set
      setShowLanguageModal(true);
      return;
    }

    // Check if current URL language matches user preference
    const currentLang = lang as LanguageCode;
    const preferredLang = userProfile.languagePreference as LanguageCode;
    
    if (currentLang !== preferredLang) {
      // Redirect to preferred language route
      const currentPath = window.location.pathname;
      const pathSegments = currentPath.split('/');
      
      if (pathSegments[1] === currentLang) {
        pathSegments[1] = preferredLang;
        const newPath = pathSegments.join('/');
        router.replace(newPath);
      }
    }
  }, [user, userProfile, loading, lang, router]);

  const handleLanguageSelected = (language: LanguageCode) => {
    setShowLanguageModal(false);
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

      {/* Language Selection Modal */}
      <LanguageSelectionModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onLanguageSelected={handleLanguageSelected}
      />
    </>
  );
}
