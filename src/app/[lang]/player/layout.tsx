"use client";

import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';
import PlayerSidebar from '@/components/navigation/PlayerSidebar';

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRedirect(['player']);
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <PageLoader 
        title="Loading Player Dashboard..."
        variant="brand"
        size="lg"
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <PlayerSidebar />
      <div className="flex-1 overflow-y-auto lg:ml-0">
        {children}
      </div>
    </div>
  );
}
