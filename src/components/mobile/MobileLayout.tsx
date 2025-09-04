'use client';

import { MobileHeader } from './MobileHeader';
import { BottomNavigation, type MobileTab } from './BottomNavigation';
import { useMobileNavigation } from '@/hooks/useMobileNavigation';

interface MobileLayoutProps {
  children: React.ReactNode;
  currentTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  title: string;
  role: 'captain' | 'player';
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export function MobileLayout({
  children,
  currentTab,
  onTabChange,
  title,
  role,
  showBackButton = false,
  onBackClick
}: MobileLayoutProps) {
  const { changeTab } = useMobileNavigation();

  const handleTabChange = (tab: MobileTab) => {
    onTabChange(tab);
    changeTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] mobile-safe-area">
      {/* Mobile Header */}
      <MobileHeader
        title={title}
        showBackButton={showBackButton}
        onBackClick={onBackClick}
      />

      {/* Main Content Area */}
      <main className="mobile-content-area overflow-auto">
        <div className="px-4 py-6">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={currentTab}
        onTabChange={handleTabChange}
        role={role}
      />
    </div>
  );
}
