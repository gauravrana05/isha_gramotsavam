'use client';

import { useState } from 'react';
import { Send, Users, Crown, Camera, Smile } from 'lucide-react';
import { MobileCard } from '../ui/MobileCard';
import { ChatMessage } from './ChatMessage';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';

export function MobileChatView() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Fetch venue chat messages
  const { data: messages, isLoading } = api.chat.getVenueMessages.useQuery(
    { venueId: user?.venueId || '' },
    { enabled: !!user?.venueId }
  );

  // Fetch venue participants
  const { data: participants } = api.chat.getVenueParticipants.useQuery(
    { venueId: user?.venueId || '' },
    { enabled: !!user?.venueId }
  );

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log('Send message:', message);
      setMessage('');
    }
  };

  const handleAttachMedia = () => {
    console.log('Attach photo/video');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>
        <div className="space-y-2">
          <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
          <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
          <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const captains = participants?.filter(p => p.role === 'captain') || [];
  const players = participants?.filter(p => p.role === 'player') || [];
  const volunteers = participants?.filter(p => p.role === 'volunteer') || [];

  return (
    <div className="space-y-4">
      {/* Chat Participants */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="mobile-card-title">Venue Chat</h3>
          <div className="flex items-center text-sm text-gray-500">
            <Users size={16} className="mr-1" />
            {participants?.length || 0} online
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-1">
              <Crown size={20} className="text-yellow-600" />
            </div>
            <p className="text-sm font-medium">{captains.length}</p>
            <p className="text-xs text-gray-600">Captains</p>
          </div>
          
          <div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1">
              <Users size={20} className="text-blue-600" />
            </div>
            <p className="text-sm font-medium">{players.length}</p>
            <p className="text-xs text-gray-600">Players</p>
          </div>
          
          <div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
              <Users size={20} className="text-green-600" />
            </div>
            <p className="text-sm font-medium">{volunteers.length}</p>
            <p className="text-xs text-gray-600">Volunteers</p>
          </div>
        </div>
      </MobileCard>

      {/* Chat Messages */}
      <div className="space-y-3">
        {messages && messages.length > 0 ? (
          messages.map((msg: any) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isOwnMessage={msg.senderId === user?.id}
              sender={msg.sender}
            />
          ))
        ) : (
          <MobileCard>
            <div className="text-center py-8">
              <Users size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="mobile-card-title mb-2">No Messages Yet</h3>
              <p className="text-gray-600">Be the first to start the conversation!</p>
            </div>
          </MobileCard>
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 px-4 py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm text-gray-500">Someone is typing...</span>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="fixed bottom-20 left-4 right-4 z-30">
        <MobileCard padding="sm">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleAttachMedia}
              className="p-2 text-gray-500 hover:text-blue-600"
            >
              <Camera size={20} />
            </button>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                <Smile size={16} />
              </button>
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="p-2 bg-[#2C5282] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2A4A7A]"
            >
              <Send size={20} />
            </button>
          </div>
        </MobileCard>
      </div>

      {/* Quick Actions */}
      <MobileCard>
        <h3 className="mobile-card-title mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100">
            Share Match Update
          </button>
          <button className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100">
            Team Announcement
          </button>
          <button className="p-3 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100">
            Share Photo
          </button>
          <button className="p-3 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100">
            Ask Question
          </button>
        </div>
      </MobileCard>

      {/* Chat Guidelines */}
      <MobileCard>
        <h3 className="mobile-card-title mb-2">Chat Guidelines</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Keep conversations respectful and tournament-related</p>
          <p>• Share updates, photos, and celebrate together</p>
          <p>• Use @mentions to get someone's attention</p>
          <p>• Report inappropriate content to volunteers</p>
        </div>
      </MobileCard>
    </div>
  );
}
