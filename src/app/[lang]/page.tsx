"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/ui/loaders";
import { useTranslation } from "@/lib/utils/i18n";
import { handleRedirect, getDashboardRoute } from "@/lib/utils/navigation";

export default function Home() {
  const { lang } = useParams();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [mockAuthProcessed, setMockAuthProcessed] = useState(false);

  useEffect(() => {
    // Handle mock authentication
    const mockRole = searchParams.get('role') || searchParams.get('mockUser');
    
    if (mockRole && !mockAuthProcessed) {
      console.log('🔍 Mock auth detected:', mockRole);
      setMockAuthProcessed(true);
      
      // First clear any existing session
      fetch('/api/auth/logout', { method: 'POST' })
        .then(() => {
          console.log('🔍 Cleared existing session');
          // Then call mock auth endpoint
          return fetch(`/api/auth/mock?role=${mockRole}`);
        })
        .then(response => response.json())
        .then(data => {
          if (data.user) {
            console.log('✅ Mock auth successful:', data.user);
            console.log('🔍 User role:', data.user.role);
            console.log('🔍 Language preference:', data.user.languagePreference);
            
            // Remove mock params
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('mockUser');
            newUrl.searchParams.delete('role');
            
            // Use the proper getDashboardRoute function
            const redirectPath = getDashboardRoute(data.user.role, lang as string, Boolean(data.user.languagePreference));
            console.log('🔍 Redirect path:', redirectPath);
            
            // Force a full page reload to ensure session is properly set
            window.location.href = redirectPath;
          } else {
            console.error('❌ Mock auth failed:', data);
          }
        })
        .catch(error => {
          console.error('❌ Mock auth error:', error);
        });
      
      return;
    }

    if (!loading && !mockRole && !mockAuthProcessed) {
      handleRedirect(user, lang as string, router);
    }
  }, [user, loading, router, lang, searchParams, mockAuthProcessed]);

  return (
    <PageLoader 
      title="Loading Isha Gramotsavam..."
      subtitle="Redirecting to your dashboard..."
      variant="brand"
      size="lg"
    />
  );
}
