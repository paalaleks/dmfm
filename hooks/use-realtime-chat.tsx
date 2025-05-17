'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState, useTransition } from 'react';
import { sendMessage as persistMessageAction } from '@/app/_actions/chat';

// Extended user profile for chat messages
export interface ChatMessageUser {
  name: string;
  avatarUrl?: string | null;
}

export interface ChatMessage {
  id: string;
  content: string;
  user: ChatMessageUser; // Use the new ChatMessageUser type
  createdAt: string;
}

interface UseRealtimeChatProps {
  roomName: string;
  username: string;
  userAvatarUrl?: string | null; // Add user's own avatar URL for optimistic messages
}

const EVENT_MESSAGE_TYPE = 'message';

export function useRealtimeChat({ roomName, username, userAvatarUrl }: UseRealtimeChatProps) {
  // Destructure userAvatarUrl
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const newChannel = supabase.channel(roomName);

    newChannel
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        // Ensure payload.payload matches ChatMessage structure, especially user object
        const receivedMessage = payload.payload as ChatMessage;
        setMessages((current) => [...current, receivedMessage]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    setChannel(newChannel);

    return () => {
      supabase.removeChannel(newChannel);
    };
  }, [roomName, supabase]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!channel || !isConnected) return;

      const clientSideMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content,
        user: {
          name: username,
          avatarUrl: userAvatarUrl, // Include avatar for optimistic message
        },
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, clientSideMessage]);

      try {
        await channel.send({
          type: 'broadcast',
          event: EVENT_MESSAGE_TYPE,
          payload: clientSideMessage, // Broadcasted message now includes avatarUrl
        });
      } catch (broadcastError) {
        console.error('Supabase broadcast error:', broadcastError);
      }

      startTransition(async () => {
        const formData = new FormData();
        formData.append('roomId', roomName);
        formData.append('content', content);
        const result = await persistMessageAction(null, formData);
        if (!result.success) {
          console.error(
            'Failed to persist message to DB:',
            result.error?.message,
            result.validationErrors
          );
        }
      });
    },
    [channel, isConnected, username, roomName, userAvatarUrl, startTransition] // Add userAvatarUrl
  );

  return { messages, sendMessage, isConnected, isSending: isPending };
}
