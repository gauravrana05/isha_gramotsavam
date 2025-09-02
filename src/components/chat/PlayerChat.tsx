'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/server/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { MessageSquare, Bell, Crown, User, Send, Shield, Reply, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

interface PlayerChatProps {
  venueId: string;
}

export default function PlayerChat({ venueId }: PlayerChatProps) {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Message composition state
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'volunteers' | 'individual'>('volunteers');
  const [targetId, setTargetId] = useState<string>('');
  const [replyToMessage, setReplyToMessage] = useState<any>(null);

  const { data: messages, refetch: refetchMessages } = api.chat.getVenueMessages.useQuery({
    venueId,
    limit: 50
  });

  const { data: volunteers } = api.chat.getVenueVolunteers.useQuery({
    venueId
  });

  const markAsReadMutation = api.chat.markAsRead.useMutation();

  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessage('');
      setTargetId('');
      setReplyToMessage(null);
      refetchMessages();
      addNotification('Message sent successfully', 'success');
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to send message', 'error');
    }
  });

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

  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await sendMessageMutation.mutateAsync({
      venueId,
      content: message.trim(),
      targetType,
      targetId: targetType === 'individual' ? targetId : undefined
    });
  };

  // Handle reply to specific message
  const handleReplyToMessage = (msg: any) => {
    setReplyToMessage(msg);
    setTargetType('individual');
    setTargetId(msg.senderId);
    setMessage(`@${msg.sender.name} `);
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyToMessage(null);
    setTargetType('volunteers');
    setTargetId('');
    setMessage('');
  };

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
      case 'volunteers':
        return <Badge variant="outline"><Shield className="w-3 h-3 mr-1" />Volunteers</Badge>;
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
    if (msg.targetType === 'volunteers' && user?.role === 'volunteer') return true;
    if (msg.targetType === 'individual' && msg.targetId === user?.id) return true;
    return false;
  };

  const relevantMessages = messages?.filter(isMessageForMe) || [];

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Venue Chat
          {relevantMessages.length > 0 && (
            <Badge variant="outline">{relevantMessages.length} messages</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-3 border rounded-lg p-3 bg-gray-50">
          {relevantMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-center">No messages yet</p>
              <p className="text-sm text-center">
                Volunteers will send updates and announcements here
              </p>
            </div>
          ) : (
            <>
              {relevantMessages.map((msg) => (
                <div key={msg.id} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getMessageIcon(msg)}
                      <span className="font-medium text-sm">{msg.sender.name}</span>
                      <Badge variant={msg.senderRole === 'admin' ? 'default' : 'secondary'}>
                        {msg.senderRole}
                      </Badge>
                      {getTargetBadge(msg)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                      {/* Only show reply button for volunteer/admin messages */}
                      {['volunteer', 'admin'].includes(msg.senderRole) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReplyToMessage(msg)}
                          className="p-1 h-6 w-6"
                        >
                          <Reply className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{msg.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Compose Area */}
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Reply indicator */}
          {replyToMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-blue-800">
                  Replying to {replyToMessage.sender.name}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={cancelReply}
                  className="p-1 h-6 w-6 text-blue-600"
                >
                  ×
                </Button>
              </div>
              <p className="text-xs text-blue-600 truncate">
                {replyToMessage.content}
              </p>
            </div>
          )}

          {/* Target Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select value={targetType} onValueChange={(value: any) => setTargetType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteers">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      All Volunteers ({volunteers?.length || 0})
                    </div>
                  </SelectItem>
                  <SelectItem value="individual">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Individual Message
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === 'individual' && (
              <div>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {volunteers?.map((volunteer) => (
                      <SelectItem key={volunteer.id} value={volunteer.id}>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {volunteer.name}
                          <Badge variant="outline">{volunteer.role}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={replyToMessage ? "Type your reply..." : "Type your message to volunteers..."}
              className="flex-1"
              rows={2}
              maxLength={500}
            />
            <Button 
              type="submit" 
              disabled={!message.trim() || sendMessageMutation.isLoading}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-right">
            {message.length}/500 characters
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
