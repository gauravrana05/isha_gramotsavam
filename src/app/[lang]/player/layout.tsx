"use client";

import { useRedirect } from '@/lib/utils/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRedirect(['player']);
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading player dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
