"use client";

import { useRedirect } from '@/lib/utils/navigation';
import VolunteerSidebar from '@/components/volunteer/VolunteerSidebar';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRedirect(['general_volunteer', 'technical_volunteer', 'verification_volunteer']);
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading volunteer dashboard...</p>
        </div>
      </div>
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
