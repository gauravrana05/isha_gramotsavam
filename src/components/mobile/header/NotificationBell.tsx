'use client';

import { Bell } from 'lucide-react';
import { cn } from '@/lib/component-patterns';

interface NotificationBellProps {
  notifications: any[];
  unreadCount: number;
  onClick: () => void;
}

export function NotificationBell({ notifications, unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2.5 text-[#4A5568] hover:text-[#2D3748] transition-colors"
    >
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-[#E53E3E] text-white text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-medium">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
