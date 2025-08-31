'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Trophy, 
  Calendar, 
  CheckCircle, 
  Hash, 
  BarChart3,
  Home
} from 'lucide-react';

const navItems = [
  { href: '', label: 'Dashboard', icon: Home },
  { href: '/checkin', label: 'Check-In', icon: CheckCircle },
  { href: '/numbers', label: 'Numbers', icon: Hash },
  { href: '/fixtures', label: 'Fixtures', icon: Trophy },
  { href: '/matches', label: 'Matches', icon: Calendar },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export function VolunteerNav() {
  const params = useParams();
  const pathname = usePathname();
  const venueId = params.venueId as string;
  
  if (!venueId) return null;

  return (
    <nav className="flex space-x-1 mb-6 p-1 bg-muted rounded-lg">
      {navItems.map((item) => {
        const href = `/volunteer/venues/${venueId}${item.href}`;
        const isActive = pathname === href;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
