'use client';

import Image from 'next/image';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { 
  LayoutDashboard,
  Calendar,
  Trophy,
  Users,
  Shield,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Home,
  Zap,
  Settings
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface PlayerSidebarProps {
  className?: string;
  isDesktopCollapsed?: boolean;
  onDesktopToggle?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string;
}

export default function PlayerSidebar({ 
  className = '', 
  isDesktopCollapsed = false, 
  onDesktopToggle,
  isMobileOpen = false,
  onMobileClose
}: PlayerSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showContent, setShowContent] = useState(!isDesktopCollapsed);
  
  const pathname = usePathname();
  const { lang } = useParams();
  const { user, userProfile, profileImage, logout } = useAuth();

  // Admin detection - check if admin is accessing player routes
  const isAdminAccessing = userProfile?.role === 'admin' && !pathname.includes('/admin/');

  // Handle content visibility delay for smooth animations
  useEffect(() => {
    if (isDesktopCollapsed) {
      // Hide content immediately when collapsing
      setShowContent(false);
    } else {
      // Show content after animation completes when expanding
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 200); // Reduced delay for better responsiveness
      return () => clearTimeout(timer);
    }
  }, [isDesktopCollapsed]);

  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: `/${lang}/player/dashboard`,
      icon: LayoutDashboard,
    },
    {
      name: 'My Team',
      href: `/${lang}/player/teams`,
      icon: Users,
    },
    {
      name: 'Fixtures',
      href: `/${lang}/player/fixtures`,
      icon: Calendar,
    },
    {
      name: 'Matches',
      href: `/${lang}/player/matches`,
      icon: Zap,
    },
  ];

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isActive = (href: string) => {
    // Exact match first
    if (pathname === href) return true;
    
    // Only activate parent for direct children, not nested routes
    // This prevents multiple items from being highlighted simultaneously
    return false;
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isExpanded = expandedItems.includes(item.name);
    const hasChildren = item.children && item.children.length > 0;
    const itemIsActive = item.href ? isActive(item.href) : false;

    return (
      <div key={item.name}>
        {item.href ? (
          <Link
            href={item.href}
            className={`flex items-center px-4 text-sm font-medium rounded-lg transition-colors h-12 ${
              depth > 0 ? 'ml-6' : ''
            } ${
              itemIsActive
                ? 'bg-[#F28C38] text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => onMobileClose?.())
            title={isDesktopCollapsed ? item.name : undefined}
          >
            <item.icon className={`w-5 h-5 ${depth > 0 ? 'mr-2' : 'mr-3'} flex-shrink-0`} />
            {showContent && (
              <div className="flex items-center w-full animate-fade-in">
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            )}
          </Link>
        ) : (
          <button
            onClick={() => !isDesktopCollapsed && toggleExpanded(item.name)}
            className={`w-full flex items-center px-4 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-12 ${
              depth > 0 ? 'ml-6' : ''
            }`}
            title={isDesktopCollapsed ? item.name : undefined}
          >
            <item.icon className={`w-5 h-5 ${depth > 0 ? 'mr-2' : 'mr-3'} flex-shrink-0`} />
            {showContent && (
              <div className="flex items-center w-full animate-fade-in">
                <span className="flex-1 text-left">{item.name}</span>
                {hasChildren && (
                  isExpanded ? (
                    <ChevronDown width={64} height={64} className="w-4 h-4" />
                  ) : (
                    <ChevronRight width={64} height={64} className="w-4 h-4" />
                  )
                )}
                {item.badge && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            )}
          </button>
        )}
        
        {hasChildren && isExpanded && showContent && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-lg border border-gray-200"
        >
          <Menu width={64} height={64} className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => onMobileClose?.())
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 z-50 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        md:left-0 md:right-auto md:translate-x-0 md:fixed md:top-0 md:bottom-0 md:flex-shrink-0 md:transition-[width] md:duration-300 md:ease-in-out
        ${isMobileOpen ? 'right-0 translate-x-0' : 'right-0 translate-x-full'}
        ${isDesktopCollapsed ? 'md:w-16' : 'md:w-64'} 
        w-full md:w-auto
        ${className}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center border-b border-gray-200 h-16 ${
            isDesktopCollapsed ? 'justify-center px-3' : 'justify-between px-4'
          }`}>
            {showContent && (
              <div className="flex items-center animate-fade-in">
                <div className="w-7 h-7 bg-[#F28C38] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users width={64} height={64} className="w-4 h-4 text-white" />
                </div>
                <div className="ml-2">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {isAdminAccessing ? 'Admin Panel' : 'Player Panel'}
                  </h2>
                  <p className="text-xs text-gray-600">Isha Gramotsavam</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {/* Desktop toggle button */}
              {onDesktopToggle && (
                <button
                  onClick={onDesktopToggle}
                  className="hidden md:block p-2 rounded-md hover:bg-gray-100 transition-colors"
                  title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isDesktopCollapsed ? (
                    <ChevronRightIcon width={64} height={64} className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronLeft width={64} height={64} className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              )}
              
              {/* Mobile close button */}
              <button
                onClick={() => onMobileClose?.()}
                className="md:hidden p-1 rounded-md hover:bg-gray-100"
              >
                <X width={64} height={64} className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* User Info */}
          {userProfile && (
            <div className={`border-b border-gray-200 bg-gray-50 h-20 flex items-center ${
              isDesktopCollapsed ? 'justify-center px-2' : 'px-4'
            }`}>
              <div className="flex items-center">
                {profileImage ? (
                  <Image 
                    src={profileImage} 
                    alt={`${userProfile.firstName} ${userProfile.lastName}`}
                    width={64} height={64} className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 bg-[#3A7F3F] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-xs">
                      {userProfile.firstName?.charAt(0)}{userProfile.lastName?.charAt(0)}
                    </span>
                  </div>
                )}
                {showContent && (
                  <div className="ml-3 animate-fade-in">
                    <p className="text-sm font-medium text-gray-900">
                      {userProfile.firstName} {userProfile.lastName}
                    </p>
                    <p className="text-xs text-gray-600 capitalize">{userProfile.role}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-none hover:scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {navigation.map(item => renderNavItem(item))}
          </nav>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 p-4 space-y-2">
            {/* Back to Admin Dashboard - only show when admin is accessing */}
            {isAdminAccessing && (
              <Link
                href={`/${lang}/admin/dashboard`}
                className="flex items-center px-4 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-12"
                onClick={() => onMobileClose?.())
                title={isDesktopCollapsed ? 'Back to Admin Dashboard' : undefined}
              >
                <Settings width={64} height={64} className="w-5 h-5 mr-3 flex-shrink-0" />
                {showContent && <span className="animate-fade-in">Back to Admin Dashboard</span>}
              </Link>
            )}
            
            <Link
              href={`/${lang}/profile`}
              className="flex items-center px-4 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-12"
              onClick={() => onMobileClose?.())
              title={isDesktopCollapsed ? (isAdminAccessing ? 'Player Profile' : 'Profile') : undefined}
            >
              <User width={64} height={64} className="w-5 h-5 mr-3 flex-shrink-0" />
              {showContent && (
                <span className="animate-fade-in">
                  {isAdminAccessing ? 'Player Profile' : 'Profile'}
                </span>
              )}
            </Link>
            
            <button
              onClick={async () => {
                try {
                  await logout();
                  setIsMobileOpen(false);
                } catch (error) {
                  // Handle logout error silently
                }
              }}
              className="w-full flex items-center px-4 text-sm font-medium text-red-700 rounded-lg hover:bg-red-50 hover:text-red-900 transition-colors h-12"
              title={isDesktopCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut width={64} height={64} className="w-5 h-5 mr-3 flex-shrink-0" />
              {showContent && <span className="animate-fade-in">Sign Out</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}