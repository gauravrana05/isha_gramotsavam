'use client'
import React, { useState } from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { 
  Home, 
  Users, 
  Calendar, 
  MapPin, 
  User,
  Trophy,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  Bell,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/component-patterns';
import { tokens } from '@/lib/design-tokens';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: number;
  children?: SidebarNavItem[];
  isExpandable?: boolean;
}

interface DesktopSidebarProps {
  role: 'captain' | 'player';
  userProfile?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    profilePhoto?: string;
  };
  className?: string;
}

// Navigation structure for captain
const getCaptainNavStructure = (lang: string): SidebarNavItem[] => [
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
    href: `/${lang}/captain/teams`,
    isExpandable: true,
    children: [
      {
        id: 'team-overview',
        label: 'Team Overview', 
        icon: Users,
        href: `/${lang}/captain/teams`,
      },
      {
        id: 'team-players',
        label: 'Manage Players',
        icon: User,
        href: `/${lang}/captain/teams/players`,
      },
    ],
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
];

// Navigation structure for player
const getPlayerNavStructure = (lang: string): SidebarNavItem[] => [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: `/${lang}/player/dashboard`,
  },
  {
    id: 'teams',
    label: 'My Teams',
    icon: Users,
    href: `/${lang}/player/teams`,
  },
  {
    id: 'matches',
    label: 'Matches',
    icon: Trophy,
    href: `/${lang}/player/matches`,
  },
];

// Sidebar nav item component
const SidebarNavItem: React.FC<{
  item: SidebarNavItem;
  isActive: boolean;
  isExpanded: boolean;
  isCollapsed: boolean;
  onToggleExpand: () => void;
  onNavigate: (href: string) => void;
  level?: number;
}> = ({ 
  item, 
  isActive, 
  isExpanded, 
  isCollapsed,
  onToggleExpand, 
  onNavigate,
  level = 0 
}) => {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;
  const indentClass = level > 0 ? 'ml-8' : '';

  const handleClick = () => {
    if (hasChildren && item.isExpandable) {
      onToggleExpand();
    } else if (item.href) {
      onNavigate(item.href);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          // Base styles
          'w-full flex items-center px-3 py-3',
          'text-left text-sm font-medium',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
          'group',
          indentClass,
          // Active state
          isActive 
            ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
          // Collapsed state
          isCollapsed && 'justify-center px-2'
        )}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        <Icon className={cn(
          'w-5 h-5 flex-shrink-0',
          isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700',
          !isCollapsed && 'mr-3'
        )} />
        
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            
            {/* Badge */}
            {item.badge && item.badge > 0 && (
              <span className={cn(
                'ml-2 px-2 py-0.5 text-xs font-medium rounded-full',
                'bg-red-100 text-red-600'
              )}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
            
            {/* Expand/collapse icon */}
            {hasChildren && item.isExpandable && (
              <ChevronDown className={cn(
                'ml-2 w-4 h-4 text-gray-500 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )} />
            )}
          </>
        )}
      </button>

      {/* Children */}
      {hasChildren && isExpanded && !isCollapsed && (
        <div className="space-y-1">
          {item.children?.map((child) => (
            <SidebarNavItem
              key={child.id}
              item={child}
              isActive={false} // Child active state logic can be added
              isExpanded={false}
              isCollapsed={false}
              onToggleExpand={() => {}}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// User profile section component  
const UserProfileSection: React.FC<{
  userProfile?: DesktopSidebarProps['userProfile'];
  isCollapsed: boolean;
  onProfileClick: () => void;
}> = ({ userProfile, isCollapsed, onProfileClick }) => {
  const displayName = userProfile?.firstName && userProfile?.lastName 
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : 'User';

  return (
    <button
      onClick={onProfileClick}
      className={cn(
        'w-full p-3 flex items-center',
        'text-left border-t border-gray-200',
        'hover:bg-gray-50 transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
        isCollapsed && 'justify-center'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-full bg-gray-300 flex-shrink-0',
        'flex items-center justify-center',
        !isCollapsed && 'mr-3'
      )}>
        {userProfile?.profilePhoto ? (
          <Image
            src={userProfile.profilePhoto}
            alt={displayName}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <User className="w-4 h-4 text-gray-600" />
        )}
      </div>
      
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {displayName}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {userProfile?.email || 'View Profile'}
          </p>
        </div>
      )}
    </button>
  );
};

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ 
  role, 
  userProfile,
  className 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useParams();
  
  const langStr = Array.isArray(lang) ? lang[0] : lang || 'en';
  
  // Get navigation structure based on role
  const navStructure = role === 'captain' 
    ? getCaptainNavStructure(langStr)
    : getPlayerNavStructure(langStr);

  // Find active item
  const findActiveItem = (items: SidebarNavItem[]): SidebarNavItem | null => {
    for (const item of items) {
      if (item.href && pathname.startsWith(item.href)) {
        return item;
      }
      if (item.children) {
        const activeChild = findActiveItem(item.children);
        if (activeChild) return activeChild;
      }
    }
    return null;
  };

  const activeItem = findActiveItem(navStructure);

  const handleToggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      router.push(href);
    }
  };

  const handleProfileClick = () => {
    router.push(`/${langStr}/${role}/profile`);
  };

  return (
    <aside 
      className={cn(
        // Fixed positioning and size
        'fixed left-0 top-0 z-40 h-screen',
        'transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64',
        // Background and styling
        'bg-white border-r border-gray-200',
        'shadow-sm',
        // Hide on mobile
        'hidden md:flex md:flex-col',
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between p-4 border-b border-gray-200',
        isCollapsed && 'justify-center'
      )}>
        {!isCollapsed && (
          <div className="flex items-center">
            <Image 
              src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
              alt="Isha Logo" 
              width={32} 
              height={32} 
              className="mr-3"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 font-fira">
                {role === 'captain' ? 'Captain' : 'Player'}
              </h2>
              <p className="text-xs text-gray-500">Dashboard</p>
            </div>
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'p-1.5 rounded-md text-gray-500 hover:text-gray-700',
            'hover:bg-gray-100 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {navStructure.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            isActive={activeItem?.id === item.id}
            isExpanded={expandedItems.has(item.id)}
            isCollapsed={isCollapsed}
            onToggleExpand={() => handleToggleExpand(item.id)}
            onNavigate={handleNavigation}
          />
        ))}
      </nav>

      {/* User Profile */}
      <UserProfileSection
        userProfile={userProfile}
        isCollapsed={isCollapsed}
        onProfileClick={handleProfileClick}
      />
    </aside>
  );
};

export default DesktopSidebar;