'use client'
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MobileBottomNav, DesktopSidebar, NavigationProvider } from '@/components/navigation';
import { Container } from '@/components/ui';
import { cn } from '@/lib/component-patterns';
import { tokens } from '@/lib/design-tokens';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'captain' | 'player';
  className?: string;
  showNavigation?: boolean;
  containerProps?: {
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    padding?: boolean;
  };
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  role,
  className,
  showNavigation = true,
  containerProps = { maxWidth: 'full', padding: true }
}) => {
  const { userProfile } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <NavigationProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        {showNavigation && (
          <DesktopSidebar 
            role={role} 
            userProfile={userProfile}
          />
        )}

        {/* Main Content Area */}
        <div className={cn(
          // Desktop: account for sidebar
          'md:ml-64 transition-all duration-300',
          // Mobile: full width
          'w-full',
          // Minimum height minus mobile bottom nav
          'min-h-screen pb-20 md:pb-0'
        )}>
          {/* Content Container */}
          <Container 
            maxWidth={containerProps.maxWidth}
            className={cn(
              'min-h-screen',
              containerProps.padding && 'py-4 md:py-6',
              className
            )}
          >
            {children}
          </Container>
        </div>

        {/* Mobile Bottom Navigation */}
        {showNavigation && (
          <MobileBottomNav role={role} />
        )}

        {/* Offline Indicator */}
        <OfflineIndicator />
      </div>
    </NavigationProvider>
  );
};

// Offline indicator component
const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-50',
      'bg-yellow-500 text-white text-center py-2 px-4',
      'text-sm font-medium',
      'md:ml-64'
    )}>
      <span className="inline-block w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
      You're offline. Some features may not be available.
    </div>
  );
};

export default DashboardLayout;