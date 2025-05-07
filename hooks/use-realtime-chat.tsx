'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState } from 'react'
import type { Tables } from '@/types/database';
import {
  sendMessage as sendMessageAction,
  editMessage as editMessageAction,
  deleteMessage as deleteMessageAction,
} from '@/app/_actions/chat-actions';

// Define RealtimeUser type (as it was in useRealtimePresenceRoom)
export type RealtimeUser = {
  id: string; // Typically the presence key, can be user ID
  name: string;
  image: string;
};

interface UseRealtimeChatProps {
  roomName: string;
  initialMessages?: ChatMessage[]; // Allow passing initial messages
  currentUserProfile: MessageSenderProfile;
}

export type MessageSenderProfile = Pick<Tables<'profiles'>, 'id' | 'username' | 'avatar_url'>;

export interface ChatMessage {
  id: number | string;
  clientSideId?: string; // Add stable client-side ID for React key
  content: string;
  created_at: string;
  profile: MessageSenderProfile | null;
  isEditPending?: boolean; // Flag for optimistic edit state
  // Potentially add: updated_at?: string; is_deleted?: boolean;
}

const EVENT_MESSAGE_TYPE = 'message';

export function useRealtimeChat({
  roomName,
  currentUserProfile,
  initialMessages = [],
}: UseRealtimeChatProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] = useState(false);
  const [presentUsers, setPresentUsers] = useState<Record<string, RealtimeUser>>({});
  const [broadcastChannel, setBroadcastChannel] = useState<ReturnType<
    typeof supabase.channel
  > | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (initialMessages.length > 0 || !roomName) {
      return;
    }

    const fetchInitialMessages = async () => {
      setIsLoadingInitialMessages(true);
      console.log(`Fetching initial messages for room: ${roomName}`);
      try {
        const { data: fetchedMessagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select(
            `
            id,
            content,
            created_at,
            user_id,
            room_id,
            profile:profiles (
              id,
              username,
              avatar_url
            )
          `
          )
          .eq('room_id', roomName)
          .order('created_at', { ascending: true })
          .limit(50);

        if (messagesError) {
          console.error(`Error fetching initial messages for room ${roomName}:`, messagesError);
          setMessages([]);
        } else if (fetchedMessagesData) {
          const mappedMessages: ChatMessage[] = fetchedMessagesData
            .map((msg) => {
              let userProfile: MessageSenderProfile | null = null;
              if (msg.profile) {
                const profileData = Array.isArray(msg.profile) ? msg.profile[0] : msg.profile;
                if (profileData) {
                  userProfile = profileData as MessageSenderProfile;
                }
              }
              return {
                id: msg.id as number | string,
                clientSideId: msg.id.toString(),
                content: msg.content as string,
                created_at: msg.created_at || new Date().toISOString(),
                profile: userProfile,
              };
            })
            .filter(Boolean) as ChatMessage[];
          setMessages(mappedMessages);
        }
      } catch (err) {
        console.error('Unexpected error fetching initial messages:', err);
        setMessages([]);
      }
      setIsLoadingInitialMessages(false);
    };

    fetchInitialMessages();
  }, [roomName, initialMessages.length, supabase]);

  useEffect(() => {
    if (!roomName) {
      console.warn('RealtimeChat: roomName is missing. Subscription cancelled.');
      return;
    }
    if (
      !currentUserProfile?.id ||
      !currentUserProfile?.username ||
      !currentUserProfile?.avatar_url
    ) {
      console.warn(
        'RealtimeChat: Missing essential profile info for presence/subscription. Subscription delayed.'
      );
      return;
    }

    // Channel for broadcasting new messages and presence
    const newBroadcastChannel = supabase.channel(`room-${roomName}`, {
      config: {
        presence: { key: currentUserProfile.id },
      },
    });

    newBroadcastChannel.on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
      const newMessage = payload.payload as ChatMessage;
      // Only add if it's from another user; sender handles their own optimistically + server action response
      if (newMessage.profile?.id !== currentUserProfile.id) {
        setMessages((current) =>
          current.find((m) => m.id === newMessage.id) ? current : [...current, newMessage]
        );
      }
    });

    newBroadcastChannel.on('presence', { event: 'sync' }, () => {
      const newState = newBroadcastChannel.presenceState<{ name: string; image: string }>();
      const updatedUsers: Record<string, RealtimeUser> = {};
      for (const key in newState) {
        if (newState[key].length > 0) {
          updatedUsers[key] = {
            id: key,
            name: newState[key][0].name,
            image: newState[key][0].image,
          };
        }
      }
      setPresentUsers(updatedUsers);
    });

    newBroadcastChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        await newBroadcastChannel.track({
          name: currentUserProfile.username!,
          image: currentUserProfile.avatar_url!,
        });
      } else {
        setIsConnected(false);
      }
    });
    setBroadcastChannel(newBroadcastChannel);

    // Channel for listening to database changes (edit, delete)
    const newDbChangesChannel = supabase
      .channel(`db-chat_messages-for-${roomName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomName}`,
        },
        (payload) => {
          console.log('Postgres change received:', payload);
          if (payload.eventType === 'UPDATE') {
            const updatedRecord = payload.new as Tables<'chat_messages'>;
            console.log(
              `[Realtime UPDATE] Received for ID: ${updatedRecord.id} (Type: ${typeof updatedRecord.id})`
            );
            setMessages((currentMessages) =>
              currentMessages.map((msg) => {
                if (msg.id === updatedRecord.id) {
                  console.log(
                    `[Realtime UPDATE] Matched message in state: ID=${msg.id}, Current isEditPending=${msg.isEditPending}`
                  );
                  return {
                    ...msg,
                    id: updatedRecord.id,
                    content: updatedRecord.content,
                    created_at: updatedRecord.created_at ?? msg.created_at,
                    isEditPending: false,
                  };
                } else {
                  return msg;
                }
              })
            );
          } else if (payload.eventType === 'DELETE') {
            console.log('DELETE event received. Payload.old:', JSON.stringify(payload.old));
            const deletedRecord = payload.old as Partial<
              Tables<'chat_messages'> & { id: number | string }
            >;
            if (deletedRecord && typeof deletedRecord.id !== 'undefined') {
              console.log('Attempting to delete message with ID from Realtime:', deletedRecord.id);
              setMessages((currentMessages) =>
                currentMessages.filter((msg) => {
                  console.log(
                    `Comparing state msg.id (${msg.id} type: ${typeof msg.id}) with deletedRecord.id (${deletedRecord.id} type: ${typeof deletedRecord.id})`
                  );
                  return msg.id !== deletedRecord.id;
                })
              );
            } else {
              console.warn(
                'DELETE event received, but payload.old.id is missing or payload.old is null/undefined:',
                payload.old
              );
            }
          } else if (payload.eventType === 'INSERT') {
            console.log(
              'Postgres INSERT event received, but ignored in favor of broadcast/optimistic flow:',
              payload.new
            );
          }
        }
      )
      .subscribe((status, err) => {
        console.log(
          `[${new Date().toISOString()}] DB Changes Channel status: ${status} for room ${roomName}`
        );
        if (status !== 'SUBSCRIBED' && err) {
          console.error(`DB Changes Channel error object for room ${roomName}:`, err);
        } else if (status !== 'SUBSCRIBED') {
          console.warn(
            `DB Changes Channel status is not SUBSCRIBED: ${status} for room ${roomName}`
          );
        }
      });

    return () => {
      if (newBroadcastChannel) {
        newBroadcastChannel.untrack();
        supabase.removeChannel(newBroadcastChannel);
      }
      if (newDbChangesChannel) {
        supabase.removeChannel(newDbChangesChannel);
      }
      setBroadcastChannel(null);
      setIsConnected(false);
      setPresentUsers({});
    };
  }, [
    roomName,
    currentUserProfile?.id,
    currentUserProfile?.username,
    currentUserProfile?.avatar_url,
    supabase,
  ]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!broadcastChannel || !isConnected || !roomName || !currentUserProfile?.id) {
        console.error('Chat not connected, roomName missing, or currentUserProfile.id missing');
        return;
      }

      const clientGeneratedId = crypto.randomUUID();
      const optimisticMessage: ChatMessage = {
        id: clientGeneratedId, // Initially, id and clientSideId are the same
        clientSideId: clientGeneratedId, // Stable key for React
        content,
        created_at: new Date().toISOString(),
        profile: currentUserProfile,
      };

      setMessages((current) => [...current, optimisticMessage]);

      try {
        await broadcastChannel.send({
          type: 'broadcast',
          event: EVENT_MESSAGE_TYPE,
          payload: { ...optimisticMessage },
        });
      } catch (error) {
        console.error('Error broadcasting message:', error);
      }

      const formData = new FormData();
      formData.append('roomId', roomName);
      formData.append('content', content);

      try {
        const result = await sendMessageAction(undefined, formData);
        if (result.success && result.data?.id) {
          const persistedMessage = result.data as Tables<'chat_messages'>;
          setMessages((currentMsgs) =>
            currentMsgs.map((msg) =>
              msg.clientSideId === clientGeneratedId // Find by stable clientSideId
                ? {
                    ...msg, // Preserve clientSideId and other optimistic fields like profile
                    id: persistedMessage.id, // Update with DB ID
                    created_at: persistedMessage.created_at ?? msg.created_at,
                  }
                : msg
            )
          );
        } else {
          console.error('Failed to persist message or missing ID in response:', result.error);
          setMessages((currentMsgs) =>
            currentMsgs.filter((msg) => msg.clientSideId !== clientGeneratedId)
          );
        }
      } catch (error) {
        console.error('Error calling sendMessage action:', error);
        setMessages((currentMsgs) =>
          currentMsgs.filter((msg) => msg.clientSideId !== clientGeneratedId)
        );
      }
    },
    [broadcastChannel, isConnected, roomName, currentUserProfile]
  );

  const handleEditMessageSubmit = useCallback(
    async (messageId: number | string, newContent: string) => {
      if (typeof messageId === 'string') {
        console.warn(
          "Attempting to edit an optimistic message by its client-side UUID. This shouldn't happen if edit controls only appear for persisted messages."
        );
        return;
      }

      let originalContent: string | undefined;
      let found = false;

      // Optimistically update local state
      setMessages((currentMsgs) => {
        const updatedMsgs = currentMsgs.map((msg) => {
          if (msg.id === messageId) {
            if (msg.content === newContent) {
              // Content hasn't changed, no need to update state or call server
              found = true; // Mark as found but no change needed
              return msg;
            }
            originalContent = msg.content; // Store original content for revert
            found = true;
            return {
              ...msg,
              content: newContent,
              isEditPending: true, // Set pending flag on optimistic update
            };
          }
          return msg;
        });
        // Only return updated array if the message was actually found
        return found ? updatedMsgs : currentMsgs;
      });

      // If message wasn't found or content didn't change, bail out
      if (!found || originalContent === undefined) {
        if (!found) console.warn(`Message with ID ${messageId} not found in state for edit.`);
        return;
      }

      // Call server action
      try {
        const result = await editMessageAction(messageId as number, newContent);
        if (!result.success) {
          console.error('Failed to edit message:', result.error);
          // Revert optimistic update on failure
          setMessages((currentMsgs) =>
            currentMsgs.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: originalContent!, isEditPending: false } // Revert content and pending flag
                : msg
            )
          );
        }
        // On success, optimistic update is already applied.
        // The isEditPending flag will be cleared by the postgres_changes listener.
      } catch (error) {
        console.error('Error calling editMessage action:', error);
        // Revert optimistic update on exception
        setMessages((currentMsgs) =>
          currentMsgs.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: originalContent!, isEditPending: false } // Revert content and pending flag
              : msg
          )
        );
      }
    },
    [editMessageAction]
  );

  const handleDeleteMessageConfirm = useCallback(
    async (messageId: number | string) => {
      if (typeof messageId === 'string') {
        console.warn("Attempting to delete an optimistic message. This shouldn't happen.");
        return;
      }

      // Find the message to potentially revert
      let messageToRevert: ChatMessage | undefined;
      setMessages((currentMsgs) => {
        messageToRevert = currentMsgs.find((msg) => msg.id === messageId);
        return currentMsgs.filter((msg) => msg.id !== messageId);
      });

      // If message wasn't even found in state, nothing to do
      if (!messageToRevert) {
        console.warn(`Message with ID ${messageId} not found in state for deletion.`);
        return;
      }

      try {
        const result = await deleteMessageAction(messageId as number);
        if (!result.success) {
          console.error('Failed to delete message:', result.error);
          // Revert optimistic update on failure
          setMessages((currentMsgs) =>
            [...currentMsgs, messageToRevert!].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          );
          // Handle error display to user if necessary
        }
        // On success, the message is already removed optimistically.
        // The postgres_changes listener for DELETE will receive the event but
        // the filter will likely not find the message again, which is fine.
      } catch (error) {
        console.error('Error calling deleteMessage action:', error);
        // Revert optimistic update on exception
        setMessages((currentMsgs) =>
          [...currentMsgs, messageToRevert!].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        );
      }
    },
    [] // Dependency on the imported server action
  );

  return {
    messages,
    sendMessage,
    isConnected,
    presentUsers,
    handleEditMessageSubmit,
    handleDeleteMessageConfirm,
    isLoadingInitialMessages,
  };
}
