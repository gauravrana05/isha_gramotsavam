'use client';

import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import { api } from '@/server/trpc/react';
import { MessageCircle, Send, Users, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CaptainChatPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);

  // Get captain's team venue (auto-detect since captain has only one team)
  const { data: captainTeam } = api.teams.getCaptainTeam.useQuery(
    undefined,
    { enabled: !!user }
  );

  const venueId = captainTeam?.venueId;

  const { data: messages = [], isLoading } = api.chat.getVenueMessages.useQuery(
    { venueId: venueId as string },
    { enabled: !!user && !!venueId }
  );

  const { data: participants = [] } = api.chat.getVenueParticipants.useQuery(
    { venueId: venueId as string },
    { enabled: !!user && !!venueId }
  );

  const sendMessageMutation = api.chat.sendMessage.useMutation();

  // Prevent background scroll on mobile
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || !venueId) return;

    try {
      await sendMessageMutation.mutateAsync({
        venueId: venueId as string,
        message: message.trim(),
        type: 'text'
      });
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (isLoading || !venueId) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Layout - Full Screen */}
      <div className="md:hidden fixed inset-0 bg-white z-50 flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">Team Chat</h1>
              <p className="text-xs text-gray-500">{participants.length} participants</p>
            </div>
          </div>
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Users className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg: any) => (
            <div key={msg.id} className={`flex ${msg.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                msg.userId === user?.id 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {msg.userId !== user?.id && (
                  <p className="text-xs opacity-70 mb-1">{msg.user?.firstName}</p>
                )}
                <p className="text-sm">{msg.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
        </div>

        <div className="grid grid-cols-4 gap-6 h-[600px]">
          {/* Messages */}
          <div className="col-span-3 bg-white rounded-lg border flex flex-col">
            <div className="p-4 border-b">
              <h2 className="font-medium">Messages</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.userId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-lg ${
                    msg.userId === user?.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {msg.userId !== user?.id && (
                      <p className="text-xs opacity-70 mb-1">{msg.user?.firstName}</p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-medium">Participants ({participants.length})</h2>
            </div>
            <div className="p-4 space-y-3">
              {participants.map((participant: any) => (
                <div key={participant.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {participant.firstName?.[0]}{participant.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{participant.firstName} {participant.lastName}</p>
                    <p className="text-xs text-gray-500">{participant.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
