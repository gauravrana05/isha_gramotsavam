"use client";

import { useRedirect } from '@/lib/utils/navigation';
import VolunteerSidebar from '@/components/volunteer/VolunteerSidebar';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRedirect(['general_volunteer', 'technical_volunteer', 'verification_volunteer']);
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <PageLoader 
        title="Loading Volunteer Dashboard..."
        variant="brand"
        size="lg"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <VolunteerSidebar />
      <div className="flex-1 lg:ml-0 min-w-0 overflow-hidden">
        <div className="lg:hidden h-16"></div>
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
