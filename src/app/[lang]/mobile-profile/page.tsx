'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { useAuth } from '@/context/AuthContext';

export default function MobileProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Auth guard
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push('/en/login');
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
