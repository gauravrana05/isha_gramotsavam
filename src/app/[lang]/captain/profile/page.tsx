'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useAuth } from '@/context/AuthContext';

export default function CaptainProfilePage() {
  const { isMobile } = useMobileDetection();
  const { user, loading } = useAuth();
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push('/en/login');
      return;
    }

    if (user.role !== 'captain') {
      router.push('/en/dashboard');
      return;
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Mobile version with just header (no bottom nav)
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] mobile-safe-area">
        <MobileHeader
          title="My Profile"
          showBackButton={true}
          onBackClick={() => router.back()}
        />
        
        <main className="mobile-content-area overflow-auto">
          <div className="px-4 py-6">
            <ProfilePage />
          </div>
        </main>
      </div>
    );
  }

  // Desktop version with container
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Captain Profile</h1>
        <ProfilePage />
      </div>
    </div>
  );
}
