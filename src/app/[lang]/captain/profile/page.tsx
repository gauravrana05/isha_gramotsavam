'use client';

import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobilePageWrapper } from '@/components/mobile/MobilePageWrapper';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { useMobileDetection } from '@/hooks/useMobileDetection';

export default function CaptainProfilePage() {
  const { isMobile } = useMobileDetection();

  // Mobile version with mobile layout
  if (isMobile) {
    return (
      <MobileLayout
        currentTab="dashboard"
        onTabChange={() => {}}
        title="My Profile"
        role="captain"
        showBackButton={true}
      >
        <MobilePageWrapper>
          <ProfilePage />
        </MobilePageWrapper>
      </MobileLayout>
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
