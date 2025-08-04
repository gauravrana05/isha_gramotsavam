"use client";

import { useRedirect } from '@/lib/utils/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/loaders';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRedirect(['admin']);
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <PageLoader 
        title="Loading Admin Panel..."
        variant="brand"
        size="lg"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <div className="flex-1 lg:ml-0 min-w-0 overflow-hidden">
        <div className="lg:hidden h-16"></div>
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
