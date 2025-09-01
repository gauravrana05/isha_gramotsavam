'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/server/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Bell, Crown, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface PlayerChatProps {
  venueId: string;
}

export default function PlayerChat({ venueId }: PlayerChatProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, refetch: refetchMessages } = api.chat.getVenueMessages.useQuery({
    venueId,
    limit: 50
  });

  const markAsReadMutation = api.chat.markAsRead.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMessages();
    }, 15000);
    return () => clearInterval(interval);
  }, [refetchMessages]);

  // Mark messages as read when component mounts
  useEffect(() => {
    markAsReadMutation.mutate({ venueId });
  }, [venueId]);

  const getMessageIcon = (msg: any) => {
    if (msg.targetType === 'individual') {
      return <Bell className="w-4 h-4 text-red-500" />;
    }
    if (msg.targetType === 'captains' && user?.role === 'captain') {
      return <Crown className="w-4 h-4 text-yellow-500" />;
    }
    if (msg.targetType === 'players' && user?.role === 'player') {
      return <User className="w-4 h-4 text-blue-500" />;
    }
    return <MessageSquare className="w-4 h-4 text-gray-500" />;
  };

  const getTargetBadge = (msg: any) => {
    switch (msg.targetType) {
      case 'all':
        return <Badge variant="secondary">All</Badge>;
      case 'captains':
        return <Badge variant="outline"><Crown className="w-3 h-3 mr-1" />Captains</Badge>;
      case 'players':
        return <Badge variant="outline"><User className="w-3 h-3 mr-1" />Players</Badge>;
      case 'individual':
        return <Badge variant="destructive">Private Message</Badge>;
      default:
        return null;
    }
  };

  const isMessageForMe = (msg: any) => {
    if (msg.targetType === 'all') return true;
    if (msg.targetType === 'captains' && user?.role === 'captain') return true;
    if (msg.targetType === 'players' && user?.role === 'player') return true;
    if (msg.targetType === 'individual' && msg.targetId === user?.id) return true;
    return false;
  };

  const relevantMessages = messages?.filter(isMessageForMe) || [];

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Venue Messages
          {relevantMessages.length > 0 && (
            <Badge variant="outline">{relevantMessages.length} messages</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        {relevantMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-center">No messages yet</p>
            <p className="text-sm text-center">
              Volunteers will send updates and announcements here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {relevantMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={`rounded-lg p-4 border-l-4 ${
                  msg.targetType === 'individual' 
                    ? 'bg-red-50 border-l-red-400' 
                    : msg.targetType === 'captains' && user?.role === 'captain'
                    ? 'bg-yellow-50 border-l-yellow-400'
                    : msg.targetType === 'players' && user?.role === 'player'
                    ? 'bg-blue-50 border-l-blue-400'
                    : 'bg-gray-50 border-l-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getMessageIcon(msg)}
                    <span className="font-medium text-sm">{msg.sender.name}</span>
                    <Badge variant={msg.senderRole === 'admin' ? 'default' : 'secondary'}>
                      {msg.senderRole}
                    </Badge>
                    {getTargetBadge(msg)}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{msg.content}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
