'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import { api } from '@/server/trpc/react';
import { MessageCircle, Send, Users, ArrowLeft, MoreVertical } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function VenueChatPage() {
  const { venueId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);

  const { data: messages = [], isLoading } = api.chat.getVenueMessages.useQuery(
    { venueId: venueId as string },
    { 
      enabled: !!user && !!venueId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false
    }
  );

  const { data: participants = [] } = api.chat.getVenueParticipants.useQuery(
    { venueId: venueId as string },
    { 
      enabled: !!user && !!venueId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false
    }
  );

  const sendMessageMutation = api.chat.sendMessage.useMutation();

  // Prevent background scroll on mobile
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, []); // Empty dependency array to run only once

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!message.trim()) return;

    try {
      await sendMessageMutation.mutateAsync({
        venueId: venueId as string,
        content: message,
        targetType: 'all',
      });
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setMessage(e.target.value);
  };

  if (isLoading) {
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
              <h1 className="font-semibold text-gray-900">{t('volunteer.chat.title', 'Venue Chat')}</h1>
              <p className="text-xs text-gray-500">{participants.length} {t('volunteer.chat.participants', 'participants')}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowParticipants(true)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Users className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Mobile Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">{t('volunteer.chat.empty', 'No messages yet')}</p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isOwnMessage = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  {!isOwnMessage && (
                    <div className="w-8 h-8 bg-[#F28C38] rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      {msg.sender?.firstName?.[0] || 'U'}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isOwnMessage ? 'order-1' : ''}`}>
                    {!isOwnMessage && (
                      <p className="text-xs text-gray-600 mb-1 px-1">
                        {msg.sender?.firstName} {msg.sender?.lastName}
                      </p>
                    )}
                    <div className={`px-3 py-2 rounded-2xl ${
                      isOwnMessage 
                        ? 'bg-[#F28C38] text-white rounded-br-md' 
                        : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <p className={`text-xs text-gray-500 mt-1 px-1 ${isOwnMessage ? 'text-right' : ''}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {isOwnMessage && (
                    <div className="w-8 h-8 bg-[#F28C38] rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      {user?.firstName?.[0] || 'U'}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Mobile Message Input */}
        <div className="p-4 bg-white border-t">
          <div className="flex gap-2 items-end">
            <div className="flex-1 bg-gray-100 rounded-full px-4 py-2">
              <input
                type="text"
                value={message}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage(e as any);
                  }
                }}
                placeholder={t('volunteer.chat.placeholder', 'Type a message...')}
                className="w-full bg-transparent text-sm focus:outline-none"
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              onClick={(e) => handleSendMessage(e as any)}
              disabled={!message.trim() || sendMessageMutation.isLoading}
              className="w-10 h-10 bg-[#F28C38] text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Participants Modal */}
        {showParticipants && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-xl max-h-[70vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900">{t('volunteer.chat.participants', 'Participants')} ({participants.length})</h3>
                <button 
                  onClick={() => setShowParticipants(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3">
                {participants.map((participant: any) => (
                  <div key={participant.id} className="flex items-center gap-3 p-2">
                    <div className="w-10 h-10 bg-[#F28C38] rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {participant.firstName?.[0] || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {participant.firstName} {participant.lastName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{participant.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Layout (unchanged) */}
      <div className="hidden md:flex h-screen pb-6">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3 p-6 border-b">
            <MessageCircle className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">
              {t('volunteer.chat.title', 'Venue Chat')}
            </h1>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {t('volunteer.chat.empty', 'No messages yet')}
                </p>
              </div>
            ) : (
              messages.map((msg: any) => (
                <div key={msg.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {msg.sender?.firstName?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {msg.sender?.firstName} {msg.sender?.lastName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="p-6 border-t">
            <div className="flex gap-3">
              <input
                type="text"
                value={message}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage(e as any);
                  }
                }}
                placeholder={t('volunteer.chat.placeholder', 'Type a message...')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={(e) => handleSendMessage(e as any)}
                disabled={!message.trim() || sendMessageMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Participants Sidebar */}
        <div className="w-64 border-l bg-gray-50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">
              {t('volunteer.chat.participants', 'Participants')}
            </h3>
          </div>
          <div className="space-y-2">
            {participants.map((participant: any) => (
              <div key={participant.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {participant.firstName?.[0] || 'U'}
                </div>
                <span className="text-sm text-gray-700">
                  {participant.firstName} {participant.lastName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
