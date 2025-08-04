"use client";

import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';

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

  return <>{children}</>;
}
