"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/ui/loaders";
import { useTranslation } from "@/lib/utils/i18n";
import { handleRedirect } from "@/lib/utils/navigation";

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
    
    if (mockRole && !user && !loading && !mockAuthProcessed) {
      console.log('🔍 Mock auth detected:', mockRole);
      setMockAuthProcessed(true);
      
      // Call mock auth endpoint
      fetch(`/api/auth/mock?role=${mockRole}`)
        .then(response => response.json())
        .then(data => {
          if (data.user) {
            console.log('✅ Mock auth successful:', data.user);
            // Remove mock params and redirect to appropriate dashboard
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('mockUser');
            newUrl.searchParams.delete('role');
            
            // Redirect based on role
            const redirectPath = data.user.role === 'admin' ? `/${lang}/admin/dashboard` :
                               data.user.role === 'captain' ? `/${lang}/captain/dashboard` :
                               data.user.role === 'player' ? `/${lang}/player/dashboard` :
                               data.user.role === 'verification_volunteer' ? `/${lang}/verification/dashboard` :
                               data.user.role === 'technical_volunteer' ? `/${lang}/volunteer/dashboard` :
                               `/${lang}/public/dashboard`;
            
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

    if (!loading && !mockRole) {
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
