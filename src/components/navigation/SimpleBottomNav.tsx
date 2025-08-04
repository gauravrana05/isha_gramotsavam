'use client'
import React from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { 
  Home, 
  Users, 
  Calendar, 
  MapPin, 
  User
} from 'lucide-react';

interface SimpleBottomNavProps {
  role: 'captain' | 'player';
}

export const SimpleBottomNav: React.FC<SimpleBottomNavProps> = ({ role }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useParams();
  
  const langStr = Array.isArray(lang) ? lang[0] : lang || 'en';

  const captainItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: `/${langStr}/captain/dashboard` },
    { id: 'team', label: 'My Team', icon: Users, href: `/${langStr}/captain/teams` },
    { id: 'fixtures', label: 'Fixtures', icon: Calendar, href: `/${langStr}/captain/fixtures` },
    { id: 'profile', label: 'Profile', icon: User, href: `/${langStr}/profile` },
  ];

  const playerItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: `/${langStr}/player/dashboard` },
    { id: 'teams', label: 'Teams', icon: Users, href: `/${langStr}/player/teams` },
    { id: 'matches', label: 'Matches', icon: Calendar, href: `/${langStr}/player/matches` },
    { id: 'profile', label: 'Profile', icon: User, href: `/${langStr}/profile` },
  ];

  const items = role === 'captain' ? captainItems : playerItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center py-2 px-1 ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default SimpleBottomNav;