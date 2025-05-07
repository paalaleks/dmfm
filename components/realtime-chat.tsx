"use client";

import { cn } from "@/lib/utils";
import { ChatMessageItem } from "@/components/chat-message";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { type ChatMessage, useRealtimeChat } from '@/hooks/use-realtime-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MessageSenderProfile } from '@/hooks/use-realtime-chat';
import { CurrentUserAvatar } from '@/components/current-user-avatar';

interface RealtimeChatProps {
  roomName: string;
  currentUserProfile: MessageSenderProfile;
  onMessage?: (messages: ChatMessage[]) => void;
  initialMessages?: ChatMessage[];
}

/**
 * Realtime chat component
 * @param roomName - The name of the room to join. Each room is a unique chat.
 * @param currentUserProfile - The full profile object of the current user.
 * @param onMessage - The callback function to handle the messages. Useful if you want to store the messages in a database.
 * @param initialMessages - The initial messages to display in the chat. Useful if you want to display messages from a database.
 * @returns The chat component
 */
export const RealtimeChat = ({
  roomName,
  currentUserProfile,
  onMessage,
  initialMessages = [],
}: RealtimeChatProps) => {
  const { containerRef, scrollToBottom } = useChatScroll();

  const {
    messages: realtimeMessages,
    sendMessage,
    isConnected,
    handleEditMessageSubmit,
    handleDeleteMessageConfirm,
  } = useRealtimeChat({
    roomName,
    currentUserProfile,
    initialMessages,
  });
  const [newMessage, setNewMessage] = useState('');

  // Transform presentUsers into the format expected by RealtimeAvatarStack

  // Merge realtime messages with initial messages
  const allMessages = useMemo(() => {
    const mergedMessages = [...initialMessages, ...realtimeMessages];
    // Remove duplicates based on message id
    const uniqueMessages = mergedMessages.filter(
      (message, index, self) => index === self.findIndex((m) => m.id === message.id)
    );
    // Sort by creation date
    const sortedMessages = uniqueMessages.sort((a, b) => a.created_at.localeCompare(b.created_at));

    return sortedMessages;
  }, [initialMessages, realtimeMessages]);

  useEffect(() => {
    if (onMessage) {
      onMessage(allMessages);
    }
  }, [allMessages, onMessage]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom();
  }, [allMessages, scrollToBottom]);

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMessage.trim() || !isConnected) return;

      sendMessage(newMessage);
      setNewMessage('');
    },
    [newMessage, isConnected, sendMessage]
  );

  // console.log('RealtimeChat: presentUsers', presentUsers);
  // console.log('RealtimeChat: avatarsForStack', avatarsForStack);
  // console.log('RealtimeChat: isConnected', isConnected);

  return (
    <div className='flex flex-col h-full w-full bg-background text-foreground antialiased'>
      {/* Header area for Room Info / Presence */}

      {/* Messages Area */}
      <div ref={containerRef} className='flex-1 overflow-y-auto p-4 space-y-4'>
        {allMessages.length === 0 ? (
          <div className='text-center text-sm text-muted-foreground'>
            No messages yet. Start the conversation!
          </div>
        ) : null}
        <div className='space-y-1'>
          {allMessages.map((message, index) => {
            const prevMessage = index > 0 ? allMessages[index - 1] : null;
            const showHeader =
              !prevMessage || prevMessage.profile?.username !== message.profile?.username;

            return (
              <div
                key={message.clientSideId || message.id}
                className='animate-in fade-in slide-in-from-bottom-4 duration-300'
              >
                <ChatMessageItem
                  message={message}
                  isOwnMessage={message.profile?.id === currentUserProfile.id}
                  showHeader={showHeader}
                  onEditSubmit={handleEditMessageSubmit}
                  onDeleteConfirm={handleDeleteMessageConfirm}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className='flex items-center w-full gap-2 border-t border-border p-4'
      >
        <div className='flex-shrink-0'>
          <CurrentUserAvatar />
        </div>
        <Input
          className={cn('rounded-full bg-background text-sm transition-all duration-300 flex-1')}
          type='text'
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder='Type a message...'
          disabled={!isConnected}
        />
        {isConnected && newMessage.trim() && (
          <Button
            className='aspect-square rounded-full animate-in fade-in slide-in-from-right-4 duration-300'
            type='submit'
            disabled={!isConnected}
          >
            <Send className='size-4' />
          </Button>
        )}
      </form>
    </div>
  );
};
