'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/server/trpc/react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Users, User, Crown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface VolunteerChatProps {
  venueId: string;
}

export default function VolunteerChat({ venueId }: VolunteerChatProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'captains' | 'players' | 'individual'>('all');
  const [targetId, setTargetId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, refetch: refetchMessages } = api.chat.getVenueMessages.useQuery({
    venueId,
    limit: 50
  });

  const { data: participants } = api.chat.getVenueParticipants.useQuery({
    venueId
  });

  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessage('');
      refetchMessages();
    }
  });

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMessages();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchMessages]);

  const getTargetBadge = (msg: any) => {
    switch (msg.targetType) {
      case 'all':
        return <Badge variant="secondary">All</Badge>;
      case 'captains':
        return <Badge variant="outline"><Crown className="w-3 h-3 mr-1" />Captains</Badge>;
      case 'players':
        return <Badge variant="outline"><User className="w-3 h-3 mr-1" />Players</Badge>;
      case 'individual':
        return <Badge variant="destructive">Private</Badge>;
      default:
        return null;
    }
  };

  const captains = participants?.filter(p => p.role === 'captain') || [];
  const players = participants?.filter(p => p.role === 'player') || [];

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Venue Chat
          <Badge variant="outline">{participants?.length || 0} participants</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-3 border rounded-lg p-3 bg-gray-50">
          {messages?.map((msg) => (
            <div key={msg.id} className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{msg.sender.name}</span>
                  <Badge variant={msg.senderRole === 'admin' ? 'default' : 'secondary'}>
                    {msg.senderRole}
                  </Badge>
                  {getTargetBadge(msg)}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-700">{msg.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Compose Area */}
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Target Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select value={targetType} onValueChange={(value: any) => setTargetType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      All Participants
                    </div>
                  </SelectItem>
                  <SelectItem value="captains">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      Captains Only ({captains.length})
                    </div>
                  </SelectItem>
                  <SelectItem value="players">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Players Only ({players.length})
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
                    {participants?.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        <div className="flex items-center gap-2">
                          {participant.role === 'captain' ? 
                            <Crown className="w-4 h-4" /> : 
                            <User className="w-4 h-4" />
                          }
                          {participant.name}
                          <Badge variant="outline">{participant.role}</Badge>
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
              placeholder="Type your message..."
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
