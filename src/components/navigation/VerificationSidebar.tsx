"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { 
  LayoutDashboard,
  Users,
  Shield,
  CheckCircle,
  Menu,
  X,
  LogOut,
  Home
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface VerificationSidebarProps {
  className?: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string;
}

export default function VerificationSidebar({ className = '' }: VerificationSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  const pathname = usePathname();
  const { lang } = useParams();
  const { user, userProfile, logout } = useAuth();

  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: `/${lang}/verification/dashboard`,
      icon: LayoutDashboard,
    },
    {
      name: 'Team Verification',
      href: `/${lang}/verification/teams`,
      icon: Users,
    },
    {
      name: 'Profile',
      href: `/${lang}/verification/profile`,
      icon: Shield,
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
    
    // For child routes, only match direct children
    if (pathname.startsWith(href + '/')) {
      return true;
    }
    
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
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              depth > 0 ? 'ml-6' : ''
            } ${
              itemIsActive
                ? 'bg-[#F28C38] text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setIsMobileOpen(false)}
          >
            <item.icon className={`w-5 h-5 ${depth > 0 ? 'mr-2' : 'mr-3'}`} />
            {item.name}
            {item.badge && (
              <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        ) : (
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors ${
              depth > 0 ? 'ml-6' : ''
            }`}
          >
            <item.icon className={`w-5 h-5 ${depth > 0 ? 'mr-2' : 'mr-3'}`} />
            <span className="flex-1 text-left">{item.name}</span>
            {item.badge && (
              <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        )}
        
        {hasChildren && isExpanded && (
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
      console.error('Logout failed:', error);
    }
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
        fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0 lg:z-0 lg:flex-shrink-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        ${className}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[#F28C38] rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-semibold text-gray-900">Verification Panel</h2>
                <p className="text-sm text-gray-600">Isha Gramotsavam</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* User Info */}
          {userProfile && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#3A7F3F] rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {userProfile.firstName?.charAt(0)}{userProfile.lastName?.charAt(0)}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {userProfile.firstName} {userProfile.lastName}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">Verification Volunteer</p>
                </div>
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
              href={`/${lang}/player/dashboard`}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
              onClick={() => setIsMobileOpen(false)}
            >
              <Home className="w-5 h-5 mr-3" />
              Back to App
            </Link>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-700 rounded-lg hover:bg-red-50 hover:text-red-900 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}