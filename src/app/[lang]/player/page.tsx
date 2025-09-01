'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';

export default function PlayerPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const lang = params.lang as string;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (user.role !== 'player') {
      router.push(`/${lang}/public`);
      return;
    }

    // Check profile completion using consistent logic
    const isProfileIncomplete = !userProfile?.profileComplete && 
                               !['admin', 'public'].includes(user.role) && 
                               !user.role.includes('volunteer');

    if (isProfileIncomplete) {
      router.push(`/${lang}/player/profile/complete`);
      return;
    }

    // All checks passed - redirect to dashboard
    router.push(`/${lang}/player/dashboard`);
  }, [user, userProfile, authLoading, router, lang]);

  return (
    <PageLoader 
      title="Loading Player Dashboard..."
      variant="brand"
      size="lg"
    />
  );
}
