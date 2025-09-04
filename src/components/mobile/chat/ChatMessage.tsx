'use client';

import { Crown, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/component-patterns';

interface ChatMessageProps {
  message: any;
  isOwnMessage: boolean;
  sender: any;
}

export function ChatMessage({ message, isOwnMessage, sender }: ChatMessageProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'captain':
        return <Crown size={12} className="text-yellow-600" />;
      case 'volunteer':
        return <Shield size={12} className="text-green-600" />;
      default:
        return <Users size={12} className="text-blue-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'captain':
        return 'text-yellow-600';
      case 'volunteer':
        return 'text-green-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className={cn(
      'flex',
      isOwnMessage ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-[80%] rounded-lg px-3 py-2',
        isOwnMessage 
          ? 'bg-[#2C5282] text-white' 
          : 'bg-white border border-gray-200'
      )}>
        {/* Sender Info */}
        {!isOwnMessage && (
          <div className="flex items-center mb-1">
            <div className="flex items-center mr-2">
              {getRoleIcon(sender?.role)}
            </div>
            <span className={cn(
              'text-xs font-medium',
              getRoleColor(sender?.role)
            )}>
              {sender?.firstName} {sender?.lastName}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {sender?.role === 'captain' ? 'Captain' : 
               sender?.role === 'volunteer' ? 'Volunteer' : 'Player'}
            </span>
          </div>
        )}

        {/* Message Content */}
        <div className="space-y-2">
          {/* Text Message */}
          {message.content && (
            <p className={cn(
              'text-sm',
              isOwnMessage ? 'text-white' : 'text-gray-900'
            )}>
              {message.content}
            </p>
          )}

          {/* Media Message */}
          {message.mediaUrl && (
            <div className="rounded overflow-hidden">
              {message.mediaType === 'image' ? (
                <img
                  src={message.mediaUrl}
                  alt="Shared media"
                  className="max-w-full h-auto"
                />
              ) : (
                <video
                  src={message.mediaUrl}
                  controls
                  className="max-w-full h-auto"
                />
              )}
            </div>
          )}

          {/* System Message */}
          {message.type === 'system' && (
            <div className="text-center">
              <p className="text-xs text-gray-500 italic">
                {message.content}
              </p>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={cn(
          'text-xs mt-1',
          isOwnMessage ? 'text-blue-200' : 'text-gray-500'
        )}>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
}
