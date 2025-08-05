'use client'
import React from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { 
  Home, 
  Users, 
  Calendar, 
  MapPin, 
  User,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/component-patterns';
;

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  isActive?: boolean;
}

interface MobileBottomNavProps {
  role: 'captain' | 'player';
  className?: string;
}

// Navigation items for different roles
const getCaptainNavItems = (lang: string): NavItem[] => [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: `/${lang}/captain/dashboard`,
  },
  {
    id: 'team',
    label: 'My Team',
    icon: Users,
    href: `/${lang}/captain/team`,
  },
  {
    id: 'fixtures',
    label: 'Fixtures',
    icon: Calendar,
    href: `/${lang}/captain/fixtures`,
  },
  {
    id: 'venue',
    label: 'Venue',
    icon: MapPin,
    href: `/${lang}/captain/venue`,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    href: `/${lang}/captain/profile`,
  },
];

const getPlayerNavItems = (lang: string): NavItem[] => [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: `/${lang}/player/dashboard`,
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: Users,
    href: `/${lang}/player/teams`,
  },
  {
    id: 'matches',
    label: 'Matches',
    icon: Trophy,
    href: `/${lang}/player/matches`,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    href: `/${lang}/player/profile`,
  },
];

// Navigation item component
const NavItem: React.FC<{
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}> = ({ item, isActive, onClick }) => {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        // Base styles - touch-friendly
        'flex flex-col items-center justify-center',
        'min-h-[64px] px-2 py-1',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'active:scale-95',
        // Active state
        isActive && 'text-primary-600',
        !isActive && 'text-gray-500 hover:text-gray-700'
      )}
      aria-label={item.label}
      role="tab"
      aria-selected={isActive}
    >
      <div className="relative">
        <Icon 
          className={cn(
            'w-6 h-6 transition-colors duration-200',
            isActive && 'text-primary-600',
            !isActive && 'text-gray-500'
          )} 
        />
        {item.badge && item.badge > 0 && (
          <div className={cn(
            'absolute -top-2 -right-2',
            'min-w-[18px] h-[18px] px-1',
            'bg-red-500 text-white text-xs font-medium',
            'rounded-full flex items-center justify-center',
            'border-2 border-white'
          )}>
            {item.badge > 99 ? '99+' : item.badge}
          </div>
        )}
      </div>
      
      <span className={cn(
        'text-xs font-medium mt-1 leading-tight',
        'transition-colors duration-200',
        isActive && 'text-primary-600',
        !isActive && 'text-gray-500'
      )}>
        {item.label}
      </span>

      {/* Active indicator */}
      {isActive && (
        <div className={cn(
          'absolute top-0 left-1/2 transform -translate-x-1/2',
          'w-8 h-1 bg-primary-600 rounded-b-full',
          'animate-in slide-in-from-top-2 duration-200'
        )} />
      )}
    </button>
  );
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  role, 
  className 
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useParams();
  
  const langStr = Array.isArray(lang) ? lang[0] : lang || 'en';
  
  // Get navigation items based on role
  const navItems = role === 'captain' 
    ? getCaptainNavItems(langStr)
    : getPlayerNavItems(langStr);

  // Determine active item based on current pathname
  const activeItem = navItems.find(item => {
    // Exact match first
    if (pathname === item.href) return true;
    
    // For nested routes, check if pathname starts with item href
    if (pathname.startsWith(item.href + '/')) return true;
    
    return false;
  }) || navItems[0]; // Default to first item if no match

  const handleNavigation = (item: NavItem) => {
    if (pathname !== item.href) {
      router.push(item.href);
    }
  };

  return (
    <nav 
      className={cn(
        // Fixed positioning
        'fixed bottom-0 left-0 right-0 z-50',
        // Background and styling
        'bg-white border-t border-gray-200',
        'shadow-lg shadow-black/10',
        // Safe area for mobile devices
        'pb-safe-area-inset-bottom',
        // Hide on desktop
        'md:hidden',
        className
      )}
      role="tablist"
      aria-label={`${role} navigation`}
    >
      <div className="grid grid-cols-4 md:grid-cols-5">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeItem?.id === item.id}
            onClick={() => handleNavigation(item)}
          />
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;