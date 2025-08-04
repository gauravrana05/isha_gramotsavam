"use client";

import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';
import CaptainSidebar from '@/components/navigation/SimpleSidebar';

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
        className='bg-white'
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <CaptainSidebar />
      <div className="flex-1 overflow-y-auto lg:ml-0">
        {children}
      </div>
    </div>
  );
}
