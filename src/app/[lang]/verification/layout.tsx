"use client";

import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';
import VerificationSidebar from '@/components/navigation/VerificationSidebar';

export default function VerificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRedirect(['verification_volunteer', 'admin']);
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <PageLoader 
        title="Loading Verification Dashboard..."
        variant="brand"
        size="lg"
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <VerificationSidebar />
      <div className="flex-1 overflow-y-auto lg:ml-0">
        {children}
      </div>
    </div>
  );
}