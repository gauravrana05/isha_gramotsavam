"use client";

import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRedirect(['captain']);
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <PageLoader 
        title="Loading Captain Dashboard..."
        variant="brand"
        size="lg"
      />
    );
  }

  return <>{children}</>;
}
