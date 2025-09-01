"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    // Handle mock authentication
    const mockRole = searchParams.get('role') || searchParams.get('mockUser');
    
    if (mockRole && !user && !loading) {
      console.log('🔍 Mock auth detected:', mockRole);
      
      // Call mock auth endpoint
      fetch(`/api/auth/mock?role=${mockRole}`)
        .then(response => response.json())
        .then(data => {
          if (data.user) {
            console.log('✅ Mock auth successful:', data.user);
            // Reload the page to trigger auth context refresh
            window.location.reload();
          } else {
            console.error('❌ Mock auth failed:', data);
          }
        })
        .catch(error => {
          console.error('❌ Mock auth error:', error);
        });
      
      return;
    }

    if (!loading) {
      handleRedirect(user, lang as string, router);
    }
  }, [user, loading, router, lang, searchParams]);

  return (
    <PageLoader 
      title="Loading Isha Gramotsavam..."
      subtitle="Redirecting to your dashboard..."
      variant="brand"
      size="lg"
    />
  );
}
