'use client';

import { MobileHeader } from '@/components/mobile/MobileHeader';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { useMobileDetection } from '@/hooks/useMobileDetection';

export default function PlayerProfilePage() {
  const { isMobile } = useMobileDetection();

  // Mobile version with just header (no bottom nav)
  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] mobile-safe-area">
        <MobileHeader
          title="My Profile"
          showBackButton={true}
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
        <h1 className="text-3xl font-bold mb-8">Player Profile</h1>
        <ProfilePage />
      </div>
    </div>
  );
}
