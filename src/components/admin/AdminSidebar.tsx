"use client";

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
  onDesktopToggle 
}: AdminSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Venues', 'Teams', 'Users']);
  const [showContent, setShowContent] = useState(!isDesktopCollapsed);
  
  const pathname = usePathname();
  const { lang } = useParams();
  const { user, userProfile, logout } = useAuth();
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
        { name: 'Location Mapping', href: `/${lang}/admin/venues/location-mapping`, icon: MapPin },
        { name: 'Division Mapping', href: `/${lang}/admin/venues/cluster-division-mapping`, icon: MapPin },
      ]
    },
    {
      name: 'Teams',
      icon: Users,
      children: [
        { name: 'All Teams', href: `/${lang}/admin/teams`, icon: Users },
        { name: 'Venue Assignment', href: `/${lang}/admin/teams/venue-assignment`, icon: MapPin },
      ]
    },
    {
      name: 'Fixtures',
      href: `/${lang}/admin/fixtures`,
      icon: Target,
    },
    {
      name: 'Matches',
      href: `/${lang}/admin/matches`,
      icon: Play,
    },
    {
      name: 'Media',
      href: `/${lang}/admin/media`,
      icon: Camera,
    },
    {
      name: 'Users',
      icon: Shield,
      children: [
        { name: 'All Users', href: `/${lang}/admin/users`, icon: Shield },
        { name: 'Volunteers', href: `/${lang}/admin/users/volunteers`, icon: UserCheck },
        { name: 'Assign Venues', href: `/${lang}/admin/users/volunteers/assign-venues`, icon: UserCheck },
      ]
    },
    // {
    //   name: 'Analytics',
    //   href: `/${lang}/admin/analytics`,
    //   icon: BarChart3,
    // },
    {
      name: 'Audit Logs',
      href: `/${lang}/admin/audit-logs`,
      icon: Shield,
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
            className={`flex items-center px-4 text-sm font-medium rounded-lg transition-colors h-12 ${
              depth > 0 ? 'ml-6' : ''
            } ${
              itemIsActive
                ? 'bg-[#F28C38] text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setIsMobileOpen(false)}
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
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
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
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}


      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:fixed lg:top-0 lg:bottom-0 lg:flex-shrink-0 lg:transition-[width] lg:duration-300 lg:ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isDesktopCollapsed ? 'lg:w-20' : 'lg:w-80'} w-80
        ${className}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center border-b border-gray-200 h-20 ${
            isDesktopCollapsed ? 'justify-center px-4' : 'justify-between px-6'
          }`}>
            {showContent && (
              <div className="flex items-center animate-fade-in">
                <div className="w-8 h-8 bg-[#F28C38] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="ml-3">
                  <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
                  <p className="text-sm text-gray-600">Isha Gramotsavam</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {/* Desktop toggle button */}
              {onDesktopToggle && (
                <button
                  onClick={onDesktopToggle}
                  className="hidden lg:block p-2 rounded-md hover:bg-gray-100 transition-colors"
                  title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isDesktopCollapsed ? (
                    <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              )}
              
              {/* Mobile close button */}
              {showContent && (
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="lg:hidden p-1 rounded-md hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          {/* User Info */}
          {userProfile && (
            <div className={`border-b border-gray-200 bg-gray-50 h-20 flex items-center ${
              isDesktopCollapsed ? 'justify-center px-2' : 'px-4'
            }`}>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#3A7F3F] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-medium text-sm">
                    {userProfile.firstName?.charAt(0)}{userProfile.lastName?.charAt(0)}
                  </span>
                </div>
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
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map(item => renderNavItem(item))}
          </nav>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 p-4 space-y-2">
            <Link
              href={`/${lang}/admin/profile`}
              className="flex items-center px-4 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-12"
              onClick={() => setIsMobileOpen(false)}
              title={isDesktopCollapsed ? 'Profile' : undefined}
            >
              <User className="w-5 h-5 mr-3 flex-shrink-0" />
              {showContent && <span className="animate-fade-in">Profile</span>}
            </Link>
            
            <Link
              href={`/${lang}/player/dashboard`}
              className="flex items-center px-4 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors h-12"
              onClick={() => setIsMobileOpen(false)}
              title={isDesktopCollapsed ? 'Back to App' : undefined}
            >
              <Home className="w-5 h-5 mr-3 flex-shrink-0" />
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
              className="w-full flex items-center px-4 text-sm font-medium text-red-700 rounded-lg hover:bg-red-50 hover:text-red-900 transition-colors h-12"
              title={isDesktopCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
              {showContent && <span className="animate-fade-in">Sign Out</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}