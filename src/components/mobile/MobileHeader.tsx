'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NotificationBell } from './header/NotificationBell';
import { NotificationPanel } from './header/NotificationPanel';
import { ProfileIcon } from './header/ProfileIcon';
import { ThreeDotsMenu } from './header/ThreeDotsMenu';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';

interface MobileHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export function MobileHeader({
  title,
  showBackButton = false,
  onBackClick
}: MobileHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { goBack } = useMobileNavigation();
  const {
    notifications,
    unreadCount,
    showPanel,
    togglePanel,
    closePanel,
    handleNotificationClick,
    handleMarkAsRead
  } = useNotifications();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      goBack();
    }
  };

  const handleProfileClick = () => {
    // Navigate to mobile profile page
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    const lang = pathParts[1] || 'en';
    const role = pathParts[2] || 'captain';
    
    router.push(`/${lang}/${role}/profile`);
  };

  const handleMenuAction = (action: string) => {
    switch (action) {
      case 'sync':
        console.log('Trigger data sync');
        break;
      case 'settings':
        console.log('Navigate to settings');
        break;
      case 'help':
        console.log('Navigate to help');
        break;
      case 'logout':
        console.log('Logout user');
        break;
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 mobile-safe-area z-50">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Left side - Back button + Title */}
          <div className="flex items-center flex-1 min-w-0">
            {showBackButton && (
              <button
                onClick={handleBackClick}
                className="p-2 text-[#2C5282] hover:text-[#2D3748] mr-2 flex-shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="mobile-header-title truncate">
              {title}
            </h1>
          </div>

          {/* Right side - Action icons */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onClick={togglePanel}
            />

            <ProfileIcon
              user={user}
              onClick={handleProfileClick}
            />

            <ThreeDotsMenu
              onMenuAction={handleMenuAction}
              user={user}
              isOnline={navigator.onLine}
              syncStatus="idle"
            />
          </div>
        </div>
      </div>

      {/* Notification Panel */}
      {showPanel && (
        <NotificationPanel
          notifications={notifications}
          onClose={closePanel}
          onMarkRead={handleMarkAsRead}
          onNotificationClick={handleNotificationClick}
        />
      )}
    </>
  );
}
