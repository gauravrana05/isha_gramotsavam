'use client';

import Image from 'next/image';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { 
  LayoutDashboard,
  MapPin,
  Users,
  Trophy,
  CheckCircle,
  Calendar,
  Camera,
  BarChart3,
  Menu,
  X,
  LogOut,
  Home,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  User,
  Settings,
  Newspaper,
  MessageCircle,
  Bell,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import VolunteerLanguageSwitcher from '@/components/volunteer/VolunteerLanguageSwitcher';

interface VolunteerSidebarProps {
  className?: string;
  isDesktopCollapsed?: boolean;
  onDesktopToggle?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  key: string;
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string;
}

export default function VolunteerSidebar({ 
  className = '', 
  isDesktopCollapsed = false, 
  onDesktopToggle,
  isMobileOpen = false,
  onMobileClose 
}: VolunteerSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Venues']);
  const [showContent, setShowContent] = useState(!isDesktopCollapsed);
  
  const pathname = usePathname();
  const { lang } = useParams();
  const { user, userProfile, profileImage, logout } = useAuth();
  const { t } = useTranslation();

  // Admin detection - check if admin is accessing volunteer routes
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

  // Extract venueId from pathname if available
  const venueId = pathname.includes('/venues/') 
    ? pathname.split('/venues/')[1]?.split('/')[0] 
    : null;

  // Base navigation items
  const baseVenueNavigation = [
    // When in venue context, show venue-specific navigation
    {
      key: 'dashboard',
      name: t('volunteer.sidebar.dashboard', 'Dashboard'),
      href: `/${lang}/volunteer/venues/${venueId}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      key: 'venue',
      name: t('volunteer.sidebar.venue', 'Venue'),
      href: `/${lang}/volunteer/venues/${venueId}`,
      icon: MapPin,
    },
    {
      key: 'teams',
      name: t('volunteer.sidebar.teams', 'Teams'),
      href: `/${lang}/volunteer/venues/${venueId}/teams`,
      icon: Users,
    },
    {
      key: 'fixtures',
      name: t('volunteer.sidebar.fixtures', 'Fixtures'),
      href: `/${lang}/volunteer/venues/${venueId}/fixtures`,
      icon: Trophy,
    },
    {
      key: 'matches',
      name: t('volunteer.sidebar.matches', 'Matches'),
      href: `/${lang}/volunteer/venues/${venueId}/matches`,
      icon: Calendar,
    },
    {
      key: 'guide',
      name: t('volunteer.sidebar.guide', 'Guide'),
      href: `/${lang}/volunteer/venues/${venueId}/guide`,
      icon: BookOpen,
    },
    {
      key: 'media',
      name: t('volunteer.sidebar.media', 'Media'),
      href: `/${lang}/volunteer/venues/${venueId}/media`,
      icon: Camera,
    },
    {
      key: 'posts',
      name: t('volunteer.sidebar.posts', 'Posts'),
      href: `/${lang}/volunteer/venues/${venueId}/post`,
      icon: Newspaper,
    },
    {
      key: 'chat',
      name: t('volunteer.sidebar.chat', 'Chat'),
      href: `/${lang}/volunteer/venues/${venueId}/chat`,
      icon: MessageCircle,
    },
    {
      key: 'notifications',
      name: t('volunteer.sidebar.notifications', 'Notifications'),
      href: `/${lang}/volunteer/venues/${venueId}/notifications`,
      icon: Bell,
    },
  ];

  const baseGeneralNavigation = [
    // When not in venue context, show general overview pages
    {
      key: 'my_venues',
      name: t('volunteer.sidebar.my_venues', 'My Venues'),
      href: `/${lang}/volunteer`,
      icon: MapPin,
    },
    {
      key: 'all_fixtures',
      name: t('volunteer.sidebar.all_fixtures', 'All Fixtures'),
      href: `/${lang}/volunteer/fixtures`,
      icon: Trophy,
    },
    {
      key: 'general_chat',
      name: t('volunteer.sidebar.chat', 'Chat'),
      href: `/${lang}/volunteer/chat`,
      icon: MessageCircle,
    },
    {
      key: 'general_notifications',
      name: t('volunteer.sidebar.notifications', 'Notifications'),
      href: `/${lang}/volunteer/notifications`,
      icon: Bell,
    },
  ];

  const navigation: NavItem[] = venueId 
    ? [...baseVenueNavigation]
    : [...baseGeneralNavigation];

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isActive = (href: string) => {
    // Exact match
    if (pathname === href) {
      return true;
    }
    
    // Count the number of path segments
    const hrefSegments = href.split('/').filter(Boolean);
    const pathnameSegments = pathname.split('/').filter(Boolean);
    
    // For venue overview (like /en/volunteer/venues/[venueId]), only match exact path
    if (hrefSegments.length === 4 && hrefSegments[2] === 'venues') {
      return pathname === href;
    }
    
    // For subpages, check if pathname starts with href but has more segments
    return pathname.startsWith(href + '/') && pathnameSegments.length > hrefSegments.length;
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isExpanded = expandedItems.includes(item.name);
    const hasChildren = item.children && item.children.length > 0;
    const itemIsActive = item.href ? isActive(item.href) : false;

    return (
      <div key={item.key}>
        {item.href ? (
          <Link
            href={item.href}
            className={`flex items-center text-xs font-medium rounded-lg transition-colors h-9 ${
              isDesktopCollapsed ? 'justify-center px-2' : 'px-3'
            } ${
              depth > 0 ? (isDesktopCollapsed ? '' : 'ml-4') : ''
            } ${
              itemIsActive
                ? 'bg-[#F28C38] text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => onMobileClose?.()}
            title={isDesktopCollapsed ? item.name : undefined}
          >
            <item.icon className={`w-4 h-4 flex-shrink-0 ${
              isDesktopCollapsed ? '' : (depth > 0 ? 'mr-2' : 'mr-2')
            }`} />
            {showContent && (
              <div className="flex items-center w-full animate-fade-in">
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            )}
          </Link>
        ) : (
          <button
            onClick={() => !isDesktopCollapsed && toggleExpanded(item.name)}
            className={`w-full flex items-center text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-9 ${
              isDesktopCollapsed ? 'justify-center px-2' : 'px-3'
            } ${
              depth > 0 ? (isDesktopCollapsed ? '' : 'ml-4') : ''
            }`}
            title={isDesktopCollapsed ? item.name : undefined}
          >
            <item.icon className={`w-4 h-4 flex-shrink-0 ${
              isDesktopCollapsed ? '' : (depth > 0 ? 'mr-2' : 'mr-2')
            }`} />
            {showContent && (
              <div className="flex items-center w-full animate-fade-in">
                <span className="flex-1 text-left">{item.name}</span>
                {hasChildren && (
                  isExpanded ? (
                    <ChevronDown width={64} height={64} className="w-3 h-3" />
                  ) : (
                    <ChevronRight width={64} height={64} className="w-3 h-3" />
                  )
                )}
                {item.badge && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Error handling removed
    }
  };

  return (
    <>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => onMobileClose?.()}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 z-50 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        md:left-0 md:right-auto md:translate-x-0 md:fixed md:top-0 md:bottom-0 md:flex-shrink-0 md:transition-[width] md:duration-300 md:ease-in-out
        ${isMobileOpen ? 'right-0 translate-x-0' : 'right-0 translate-x-full'}
        ${isDesktopCollapsed ? 'md:w-16' : 'md:w-[280px]'} 
        w-full
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
                  <CheckCircle width={64} height={64} className="w-4 h-4 text-white" />
                </div>
                <div className="ml-2">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {isAdminAccessing ? t('volunteer.sidebar.admin_panel', 'Admin Panel') : t('volunteer.sidebar.volunteer_panel', 'Volunteer Panel')}
                  </h2>
                  <p className="text-xs text-gray-600">{t('volunteer.sidebar.isha_gramotsavam', 'Isha Gramotsavam')}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              {/* Desktop toggle button */}
              {onDesktopToggle && (
                <button
                  onClick={onDesktopToggle}
                  className="hidden md:block p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isDesktopCollapsed ? (
                    <ChevronRightIcon width={64} height={64} className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronLeft width={64} height={64} className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}
              
              {/* Mobile close button */}
              <button
                onClick={() => onMobileClose?.()}
                className="md:hidden p-1 rounded-md hover:bg-gray-100"
              >
                <X width={64} height={64} className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* User Info */}
          {userProfile && (
            <div className={`border-b border-gray-200 bg-gray-50 h-16 flex items-center ${
              isDesktopCollapsed ? 'justify-center px-2' : 'px-3'
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
                  <div className="ml-2 animate-fade-in">
                    <p className="text-xs font-medium text-gray-900">
                      {userProfile.firstName} {userProfile.lastName}
                    </p>
                    <p className="text-xs text-gray-600 capitalize">{userProfile.role}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-none hover:scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {navigation.map(item => renderNavItem(item))}
          </nav>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 p-3 space-y-1">
            {/* Language Switcher */}
            <VolunteerLanguageSwitcher 
              isCollapsed={isDesktopCollapsed} 
              showText={showContent}
            />

            {/* Profile - only show when admin is NOT accessing */}
            {!isAdminAccessing && (
              <Link
                href={`/${lang}/volunteer/profile`}
                className={`flex items-center text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-9 ${
                  isDesktopCollapsed ? 'justify-center px-2' : 'px-3'
                }`}
                onClick={() => onMobileClose?.()}
                title={isDesktopCollapsed ? 'Profile' : undefined}
              >
                <User width={64} height={64} className={`w-4 h-4 flex-shrink-0 ${
                  isDesktopCollapsed ? '' : 'mr-2'
                }`} />
                {showContent && <span className="animate-fade-in">Profile</span>}
              </Link>
            )}

            {/* Back to Admin Dashboard - only show when admin is accessing */}
            {isAdminAccessing && (
              <Link
                href={`/${lang}/admin/dashboard`}
                className={`flex items-center text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-9 ${
                  isDesktopCollapsed ? 'justify-center px-2' : 'px-3'
                }`}
                onClick={() => onMobileClose?.()}
                title={isDesktopCollapsed ? 'Back to Admin Dashboard' : undefined}
              >
                <Settings width={64} height={64} className={`w-4 h-4 flex-shrink-0 ${
                  isDesktopCollapsed ? '' : 'mr-2'
                }`} />
                {showContent && <span className="animate-fade-in">Back to Admin Dashboard</span>}
              </Link>
            )}
            
            <Link
              href={`/${lang}/player/dashboard`}
              className={`flex items-center text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-9 ${
                isDesktopCollapsed ? 'justify-center px-2' : 'px-3'
              }`}
              onClick={() => onMobileClose?.()}
              title={isDesktopCollapsed ? 'Back to App' : undefined}
            >
              <Home width={64} height={64} className={`w-4 h-4 flex-shrink-0 ${
                isDesktopCollapsed ? '' : 'mr-2'
              }`} />
              {showContent && <span className="animate-fade-in">Back to App</span>}
            </Link>
            
            <button
              onClick={handleLogout}
              className={`w-full flex items-center text-xs font-medium text-red-700 rounded-lg hover:bg-red-50 hover:text-red-900 transition-colors h-9 ${
                isDesktopCollapsed ? 'justify-center px-2' : 'px-3'
              }`}
              title={isDesktopCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut width={64} height={64} className={`w-4 h-4 flex-shrink-0 ${
                isDesktopCollapsed ? '' : 'mr-2'
              }`} />
              {showContent && <span className="animate-fade-in">Sign Out</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}