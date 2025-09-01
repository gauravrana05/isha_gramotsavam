'use client';

import Image from 'next/image';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { 
  LayoutDashboard,
  Calendar,
  Trophy,
  MapPin,
  Users,
  UserCheck,
  Shield,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Home,
  User,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Target,
  Play,
  Camera,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface AdminSidebarProps {
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

export default function AdminSidebar({ 
  className = '', 
  isDesktopCollapsed = false, 
  onDesktopToggle,
  isMobileOpen = false,
  onMobileClose
}: AdminSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Venues', 'Teams', 'Users']);
  const [showContent, setShowContent] = useState(!isDesktopCollapsed);
  
  const pathname = usePathname();
  const { lang } = useParams();
  const { user, userProfile, profileImage, logout } = useAuth();
  const router = useRouter();

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
      href: `/${lang}/admin/dashboard`,
      icon: LayoutDashboard,
    },
    {
      name: 'Events',
      href: `/${lang}/admin/events`,
      icon: Calendar,
    },
    {
      name: 'Sports',
      href: `/${lang}/admin/sports`,
      icon: Trophy,
    },
    {
      name: 'Venues',
      icon: MapPin,
      children: [
        { name: 'All Venues', href: `/${lang}/admin/venues`, icon: MapPin },
        { name: 'Location Mapping', href: `/${lang}/admin/location-mapping`, icon: Target },
        { name: 'Cluster-Division', href: `/${lang}/admin/cluster-division-mapping`, icon: Target },
      ]
    },
    {
      name: 'Teams',
      icon: Users,
      children: [
        { name: 'All Teams', href: `/${lang}/admin/teams`, icon: Users },
        { name: 'Venue Assignment', href: `/${lang}/admin/team-venue-assignment`, icon: MapPin },
      ]
    },
    {
      name: 'Tournament',
      icon: Trophy,
      children: [
        { name: 'Fixtures', href: `/${lang}/admin/fixtures`, icon: Target },
        { name: 'Matches', href: `/${lang}/admin/matches`, icon: Play },
      ]
    },
    {
      name: 'Users',
      icon: Shield,
      children: [
        { name: 'All Users', href: `/${lang}/admin/users`, icon: Shield },
        { name: 'Volunteers', href: `/${lang}/admin/users/volunteers`, icon: UserCheck },
      ]
    },
    {
      name: 'System',
      icon: Settings,
      children: [
        { name: 'Media', href: `/${lang}/admin/media`, icon: Camera },
        { name: 'Audit Logs', href: `/${lang}/admin/audit-logs`, icon: CheckCircle },
      ]
    }
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
        ${isDesktopCollapsed ? 'md:w-16' : 'md:w-72'} 
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
                  <Shield width={64} height={64} className="w-4 h-4 text-white" />
                </div>
                <div className="ml-2">
                  <h2 className="text-sm font-semibold text-gray-900">Admin Panel</h2>
                  <p className="text-xs text-gray-600">Isha Gramotsavam</p>
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
            <Link
              href={`/${lang}/admin/profile`}
              className={`flex items-center text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-9 ${
                isDesktopCollapsed ? 'justify-center px-2' : 'px-3'
              }`}
              onClick={() => onMobileClose?.()}
              title={isDesktopCollapsed ? 'Profile' : undefined}
            >
              <User className={`w-4 h-4 flex-shrink-0 ${isDesktopCollapsed ? '' : 'mr-2'}`} />
              {showContent && <span className="animate-fade-in">Profile</span>}
            </Link>
            
            <Link
              href={`/${lang}/player/dashboard`}
              className={`flex items-center text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-9 ${
                isDesktopCollapsed ? 'justify-center px-2' : 'px-3'
              }`}
              onClick={() => onMobileClose?.()}
              title={isDesktopCollapsed ? 'Back to App' : undefined}
            >
              <Home className={`w-4 h-4 flex-shrink-0 ${isDesktopCollapsed ? '' : 'mr-2'}`} />
              {showContent && <span className="animate-fade-in">Back to App</span>}
            </Link>
            
            <button
              onClick={async () => {
                try {
                  await logout();
                  router.push(`/${lang}/login`);
                  setIsMobileOpen(false);
                } catch (error) {
                  // Error handling removed
                }
              }}
              className={`w-full flex items-center text-xs font-medium text-red-700 rounded-lg hover:bg-red-50 hover:text-red-900 transition-colors h-9 ${
                isDesktopCollapsed ? 'justify-center px-2' : 'px-3'
              }`}
              title={isDesktopCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut className={`w-4 h-4 flex-shrink-0 ${isDesktopCollapsed ? '' : 'mr-2'}`} />
              {showContent && <span className="animate-fade-in">Sign Out</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}