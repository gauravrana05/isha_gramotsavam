'use client';

import { Home, Users, Activity, Image, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/component-patterns';

export type MobileTab = 'dashboard' | 'team' | 'live' | 'media' | 'chat';

interface BottomNavigationProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  role: 'captain' | 'player';
}

const tabs = [
  { id: 'dashboard' as MobileTab, icon: Home, label: 'Dashboard' },
  { id: 'team' as MobileTab, icon: Users, label: 'Team' },
  { id: 'live' as MobileTab, icon: Activity, label: 'Live' },
  { id: 'media' as MobileTab, icon: Image, label: 'Media' },
  { id: 'chat' as MobileTab, icon: MessageCircle, label: 'Chat' },
];

export function BottomNavigation({ activeTab, onTabChange, role }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 mobile-safe-area z-50">
      <div className="flex items-center justify-around h-20">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center mobile-touch-target transition-colors',
                isActive 
                  ? 'text-[#2C5282]' 
                  : 'text-[#A0AEC0] hover:text-[#4A5568]'
              )}
            >
              <Icon 
                size={24} 
                className={cn(
                  'mb-1',
                  isActive && 'fill-current'
                )} 
              />
              <span className="mobile-tab-label">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
