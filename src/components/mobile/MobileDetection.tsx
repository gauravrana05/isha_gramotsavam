'use client';

import { useEffect, useState } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface MobileDetectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function MobileDetection({ children, fallback }: MobileDetectionProps) {
  const { isMobile } = useMobileDetection();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  // Show mobile interface on mobile devices
  if (isMobile) {
    return <>{children}</>;
  }

  // Show fallback or redirect to desktop on larger screens
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default: redirect to desktop version
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const desktopPath = currentPath.replace('/mobile', '');
    window.location.href = desktopPath;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Redirecting to desktop version...</p>
    </div>
  );
}
