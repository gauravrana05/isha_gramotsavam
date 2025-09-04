'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getChatStorage, ChatMessageRecord, ChatParticipantRecord, ChatSendQueue } from '@/lib/services/offline/chatStorage';

interface VenueChatData {
  messages: ChatMessageRecord[];
  participants: ChatParticipantRecord[];
  typingUsers: string[];
  isLoading: boolean;
  error: string | null;
}

export function useOfflineVenueChat(venueId: string) {
  const { user } = useAuth();
  const [data, setData] = useState<VenueChatData>({
    messages: [],
    participants: [],
    typingUsers: [],
    isLoading: true,
    error: null
  });

  const loadChatData = useCallback(async () => {
    if (!venueId) return;

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const storage = await getChatStorage();
      
      const [messages, participants, typingUsers] = await Promise.all([
        storage.getVenueMessages(venueId, 50), // Last 50 messages
        storage.getVenueParticipants(venueId),
        storage.getTypingUsers(venueId)
      ]);

      setData(prev => ({
        ...prev,
        messages,
        participants,
        typingUsers,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading chat data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load chat data'
      }));
    }
  }, [venueId]);

  const sendMessage = useCallback(async (content: string, type: 'text' | 'image' = 'text', mediaFile?: File) => {
    if (!user || !venueId) return;

    try {
      const storage = await getChatStorage();
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const queueMessage: ChatSendQueue = {
        id: tempId,
        venueId,
        tempId,
        content,
        type,
        mediaFile,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending'
      };

      await storage.addToSendQueue(queueMessage);
      
      // Add optimistic message to UI
      const optimisticMessage: ChatMessageRecord = {
        id: tempId,
        data: {
          id: tempId,
          venueId,
          senderId: user.id,
          senderName: `${user.firstName} ${user.lastName}`,
          senderRole: user.role as 'captain' | 'player' | 'volunteer',
          content,
          type,
          createdAt: new Date().toISOString()
        },
        timestamp: Date.now(),
        lastModified: Date.now(),
        userId: user.id,
        venueId,
        version: 1,
        synced: false,
        priority: 'high',
        size: content.length
      };

      setData(prev => ({
        ...prev,
        messages: [optimisticMessage, ...prev.messages]
      }));

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [user, venueId]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!user || !venueId) return;

    try {
      const storage = await getChatStorage();
      await storage.setTypingIndicator(venueId, user.id, isTyping);
      
      // Update local typing indicators
      const typingUsers = await storage.getTypingUsers(venueId);
      setData(prev => ({
        ...prev,
        typingUsers: typingUsers.filter(userId => userId !== user.id)
      }));
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }, [user, venueId]);

  useEffect(() => {
    if (venueId) {
      loadChatData();
    }
  }, [venueId, loadChatData]);

  // Refresh typing indicators periodically
  useEffect(() => {
    if (!venueId) return;

    const interval = setInterval(async () => {
      try {
        const storage = await getChatStorage();
        const typingUsers = await storage.getTypingUsers(venueId);
        setData(prev => ({
          ...prev,
          typingUsers: user ? typingUsers.filter(userId => userId !== user.id) : typingUsers
        }));
      } catch (error) {
        console.error('Error refreshing typing indicators:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [venueId, user]);

  return {
    ...data,
    actions: {
      sendMessage,
      setTyping,
      refresh: loadChatData
    }
  };
}
