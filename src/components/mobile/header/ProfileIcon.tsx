'use client';

import { User, Crown, Shield } from 'lucide-react';
import { cn } from '@/lib/component-patterns';

interface ProfileIconProps {
  user: any;
  onClick: () => void;
}

export function ProfileIcon({ user, onClick }: ProfileIconProps) {
  const getRoleIcon = () => {
    switch (user?.role) {
      case 'captain':
        return <Crown size={12} className="text-yellow-600" />;
      case 'volunteer':
        return <Shield size={12} className="text-green-600" />;
      default:
        return null;
    }
  };

  const getRoleBorderColor = () => {
    switch (user?.role) {
      case 'captain':
        return 'ring-yellow-300';
      case 'volunteer':
        return 'ring-green-300';
      case 'player':
        return 'ring-blue-300';
      default:
        return 'ring-gray-300';
    }
  };

  return (
    <button
      onClick={onClick}
      className="relative p-2.5 text-[#4A5568] hover:text-[#2D3748] transition-colors"
    >
      <div className="relative">
        {user?.profileImage ? (
          <img
            src={user.profileImage}
            alt="Profile"
            className={cn(
              'w-5 h-5 rounded-full object-cover ring-2',
              getRoleBorderColor()
            )}
          />
        ) : (
          <div className={cn(
            'w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center ring-2',
            getRoleBorderColor()
          )}>
            <User size={12} className="text-gray-600" />
          </div>
        )}
        
        {/* Role Badge */}
        {getRoleIcon() && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
            {getRoleIcon()}
          </div>
        )}
      </div>
    </button>
  );
}
