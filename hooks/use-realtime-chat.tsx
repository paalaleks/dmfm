'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useState, useRef } from 'react';
import type { Tables } from '@/types/database';
import {
  sendMessage as sendMessageAction,
  editMessage as editMessageAction,
  deleteMessage as deleteMessageAction,
} from '@/app/_actions/chat';

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
  id: number | string; // Can be clientSideId (string) initially, then dbId (number)
  clientSideId: string; // Stable client-generated UUID
  content: string;
  created_at: string;
  profile: MessageSenderProfile | null;
  isOptimistic: boolean; // Flag for optimistic state
  isEditPending?: boolean; // Flag for optimistic edit state
}

// const EVENT_MESSAGE_TYPE = 'message'; // Now unused
const EVENT_OPTIMISTIC_MESSAGE_RECEIVED = 'optimistic_message_received';
const EVENT_MESSAGE_CONFIRMED = 'message_confirmed';
const EVENT_OPTIMISTIC_MESSAGE_EDITED = 'optimistic_message_edited';
const EVENT_OPTIMISTIC_MESSAGE_DELETED = 'optimistic_message_deleted';
const EVENT_MESSAGE_EDIT_CONFIRMED = 'message_edit_confirmed';
const EVENT_MESSAGE_EDIT_FAILED = 'message_edit_failed';
const EVENT_MESSAGE_DELETE_CONFIRMED = 'message_delete_confirmed';
const EVENT_MESSAGE_DELETE_FAILED = 'message_delete_failed';

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
  const currentBroadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null); // Ref for current broadcast channel
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
                id: msg.id as number, // DB IDs are numbers
                clientSideId: msg.id.toString(), // Use DB ID as clientSideId for initial messages
                content: msg.content as string,
                created_at: msg.created_at || new Date().toISOString(),
                profile: userProfile,
                isOptimistic: false, // Initial messages are not optimistic
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
    const newBroadcastChannelInstance = supabase.channel(`room-${roomName}`, {
      config: {
        presence: { key: currentUserProfile.id },
      },
    });
    currentBroadcastChannelRef.current = newBroadcastChannelInstance; // Store current instance in ref

    // Listener for optimistic messages broadcasted by any client
    newBroadcastChannelInstance.on(
      'broadcast',
      { event: EVENT_OPTIMISTIC_MESSAGE_RECEIVED },
      (payload) => {
        if (currentBroadcastChannelRef.current !== newBroadcastChannelInstance) return; // Stale channel
        const optimisticMsgPayload = payload.payload as ChatMessage;
        // Add to local state if this clientSideId isn't already present
        setMessages((current) =>
          current.find((m) => m.clientSideId === optimisticMsgPayload.clientSideId)
            ? current
            : [...current, optimisticMsgPayload]
        );
      }
    );

    // Listener for message confirmations broadcasted by the sender after DB persistence
    newBroadcastChannelInstance.on('broadcast', { event: EVENT_MESSAGE_CONFIRMED }, (payload) => {
      if (currentBroadcastChannelRef.current !== newBroadcastChannelInstance) return; // Stale channel
      const { clientSideId, dbId, dbCreatedAt } = payload.payload as {
        clientSideId: string;
        dbId: number;
        dbCreatedAt: string;
      };
      setMessages((currentMsgs) =>
        currentMsgs.map((msg) =>
          msg.clientSideId === clientSideId
            ? {
                ...msg,
                id: dbId,
                created_at: dbCreatedAt,
                isOptimistic: false,
                isEditPending: false,
              } // Clear isEditPending on confirmation
            : msg
        )
      );
    });

    // Listener for optimistic message edits
    newBroadcastChannelInstance.on(
      'broadcast',
      { event: EVENT_OPTIMISTIC_MESSAGE_EDITED },
      (payload) => {
        if (currentBroadcastChannelRef.current !== newBroadcastChannelInstance) return;
        const { clientSideId, newContent } = payload.payload as {
          clientSideId: string;
          newContent: string;
        };
        setMessages((currentMsgs) =>
          currentMsgs.map((msg) =>
            msg.clientSideId === clientSideId
              ? { ...msg, content: newContent, isEditPending: true }
              : msg
          )
        );
      }
    );

    // Listener for message edit confirmations
    newBroadcastChannelInstance.on(
      'broadcast',
      { event: EVENT_MESSAGE_EDIT_CONFIRMED },
      (payload) => {
        if (currentBroadcastChannelRef.current !== newBroadcastChannelInstance) return;
        const { clientSideId, updatedContent /*,updatedAt*/ } = payload.payload as {
          clientSideId: string;
          updatedContent: string;
          updatedAt?: string;
        };
        setMessages((currentMsgs) =>
          currentMsgs.map((msg) =>
            msg.clientSideId === clientSideId
              ? {
                  ...msg,
                  content: updatedContent,
                  isEditPending: false /*, updated_at: updatedAt*/,
                }
              : msg
          )
        );
      }
    );

    // Listener for message edit failures
    newBroadcastChannelInstance.on('broadcast', { event: EVENT_MESSAGE_EDIT_FAILED }, (payload) => {
      if (currentBroadcastChannelRef.current !== newBroadcastChannelInstance) return;
      const { clientSideId, originalContent } = payload.payload as {
        clientSideId: string;
        originalContent: string;
      };
      setMessages((currentMsgs) =>
        currentMsgs.map((msg) =>
          msg.clientSideId === clientSideId
            ? { ...msg, content: originalContent, isEditPending: false }
            : msg
        )
      );
    });

    // Listener for optimistic message deletes
    newBroadcastChannelInstance.on(
      'broadcast',
      { event: EVENT_OPTIMISTIC_MESSAGE_DELETED },
      (payload) => {
        if (currentBroadcastChannelRef.current !== newBroadcastChannelInstance) return;
        const { clientSideId } = payload.payload as { clientSideId: string };
        setMessages((currentMsgs) =>
          currentMsgs.filter((msg) => msg.clientSideId !== clientSideId)
        );
      }
    );

    // Listener for message delete confirmations
    newBroadcastChannelInstance.on(
      'broadcast',
      { event: EVENT_MESSAGE_DELETE_CONFIRMED },
      (payload) => {
        if (currentBroadcastChannelRef.current !== newBroadcastChannelInstance) return;
        // const { clientSideId } = payload.payload as { clientSideId: string };
        // Message should already be deleted optimistically. This is a confirmation.
        // No state change usually needed here unless you want to track confirmation specifically.
        console.log('Message delete confirmed via broadcast:', payload.payload.clientSideId);
      }
    );

    // Listener for message delete failures
    newBroadcastChannelInstance.on(
      'broadcast',
      { event: EVENT_MESSAGE_DELETE_FAILED },
      (payload) => {
        if (currentBroadcastChannelRef.current !== newBroadcastChannelInstance) return;
        const { originalMessage } = payload.payload as { originalMessage: ChatMessage };
        // Add the message back if it's not already there (e.g., from a DB event that beat this broadcast)
        setMessages((currentMsgs) => {
          if (!currentMsgs.find((m) => m.clientSideId === originalMessage.clientSideId)) {
            // Sort messages by created_at after re-adding to maintain order
            return [...currentMsgs, originalMessage].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          }
          return currentMsgs;
        });
      }
    );

    newBroadcastChannelInstance.on('presence', { event: 'sync' }, () => {
      if (currentBroadcastChannelRef.current !== newBroadcastChannelInstance) return; // Stale channel
      const newState = newBroadcastChannelInstance.presenceState<{ name: string; image: string }>();
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

    newBroadcastChannelInstance.subscribe(async (status) => {
      if (currentBroadcastChannelRef.current !== newBroadcastChannelInstance) {
        // This callback is for a stale channel instance, do not proceed.
        // Also, don't set isConnected based on a stale channel.
        return;
      }

      if (status === 'SUBSCRIBED') {
        setIsConnected(true); // This channel is connected
        try {
          await newBroadcastChannelInstance.track({
            // TRACK CALLED HERE
            name: currentUserProfile.username!,
            image: currentUserProfile.avatar_url!,
          });
        } catch (trackError) {
          console.error('Error tracking presence:', trackError);
        }
      } else {
        // If broadcast channel is not subscribed or error, reflect in isConnected.
        // However, ensure this doesn't flip isConnected if dbChangesChannel is still fine (if they share isConnected)
        // For now, this setIsConnected(false) is specific to this channel's non-subscribed states.
        setIsConnected(false);
      }
    });
    setBroadcastChannel(newBroadcastChannelInstance); // Store the channel instance in state

    // Channel for listening to database changes (edit, delete, and INSERT as fallback)
    const newDbChangesChannelInstance = supabase
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
        
          if (payload.eventType === 'UPDATE') {
            const updatedRecord = payload.new as Tables<'chat_messages'>;

            setMessages((currentMessages) =>
              currentMessages.map((msg) => {
                if (msg.id === updatedRecord.id) {
                  return {
                    ...msg,
                    id: updatedRecord.id,
                    content: updatedRecord.content,
                    created_at: updatedRecord.created_at ?? msg.created_at,
                    isEditPending: false, // DB update implies edit is no longer pending
                    isOptimistic: false, // DB update implies message is confirmed
                  };
                } else {
                  return msg;
                }
              })
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedRecord = payload.old as Partial<
              Tables<'chat_messages'> & { id: number | string }
            >;
            if (deletedRecord && typeof deletedRecord.id !== 'undefined') {
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
            // This INSERT handler is now primarily a fallback or for external insertions.
            // Optimistic messages should be confirmed via EVENT_MESSAGE_CONFIRMED broadcast.
            const dbRecord = payload.new as Tables<'chat_messages'> & {
              profile?: MessageSenderProfile | MessageSenderProfile[];
            };

            setMessages((currentMsgs) => {
              // Check if this message (by DB ID) is already confirmed in our state
              const alreadyConfirmed = currentMsgs.find(
                (m) => m.id === dbRecord.id && !m.isOptimistic
              );
              if (alreadyConfirmed) {
                return currentMsgs; // Already have it, no change needed
              }

              // Attempt to find and update a corresponding optimistic message
              // This heuristic is for robustness, in case confirmation broadcast was missed.
              const optimisticMatch = currentMsgs.find(
                (m) =>
                  m.isOptimistic &&
                  m.profile?.id === dbRecord.user_id && // Match sender
                  m.content === dbRecord.content // Match content (can be risky if user sends same message twice quickly)
                // A more robust match would involve passing clientSideId to DB and getting it back,
                // but current server action doesn't support that for direct DB events.
              );

              if (optimisticMatch) {
                return currentMsgs.map((msg) =>
                  msg.clientSideId === optimisticMatch.clientSideId
                    ? {
                        ...msg,
                        id: dbRecord.id,
                        created_at: dbRecord.created_at || msg.created_at,
                        isOptimistic: false,
                        // Profile should already be set from optimistic message
                      }
                    : msg
                );
              } else {
                // If no optimistic match, and not already confirmed, treat as a new message from DB.
                let userProfile: MessageSenderProfile | null = null;
                if (dbRecord.user_id === currentUserProfile.id) {
                  userProfile = currentUserProfile;
                } else if (dbRecord.profile) {
                  const profileData = Array.isArray(dbRecord.profile)
                    ? dbRecord.profile[0]
                    : dbRecord.profile;
                  if (
                    profileData &&
                    typeof profileData === 'object' &&
                    'id' in profileData &&
                    'username' in profileData
                  ) {
                    userProfile = profileData as MessageSenderProfile;
                  } else {
                    console.warn(
                      "DB INSERT event's profile data (other user) is not in expected format:",
                      dbRecord.profile
                    );
                  }
                } else if (dbRecord.user_id) {
                  console.warn(
                    `DB INSERT event for message ${dbRecord.id} from other user ${dbRecord.user_id} missing profile data. Profile will be null.`
                  );
                }

                const newMessageFromDb: ChatMessage = {
                  id: dbRecord.id,
                  clientSideId: dbRecord.id.toString(), // Use DB ID as clientSideId
                  content: dbRecord.content,
                  created_at: dbRecord.created_at || new Date().toISOString(),
                  profile: userProfile,
                  isOptimistic: false, // It's from the DB, so it's confirmed
                };
                return [...currentMsgs, newMessageFromDb];
              }
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED' && err) {
          console.error(`DB Changes Channel error object for room ${roomName}:`, err);
        } else if (status !== 'SUBSCRIBED') {
          console.warn(
            `DB Changes Channel status is not SUBSCRIBED: ${status} for room ${roomName}`
          );
        }
      });

    return () => {
      // Cleanup for the specific instances created in this effect run
      if (newBroadcastChannelInstance) {
        // Check if it's still the current one before untracking, though removeChannel should handle it
        if (currentBroadcastChannelRef.current === newBroadcastChannelInstance) {
          // newBroadcastChannelInstance.untrack(); // Supabase client auto-untracks on removeChannel
          currentBroadcastChannelRef.current = null;
        }
        supabase.removeChannel(newBroadcastChannelInstance);
      }
      if (newDbChangesChannelInstance) {
        supabase.removeChannel(newDbChangesChannelInstance);
      }
      // setBroadcastChannel(null); // State will be updated if effect re-runs and creates a new one
      // setIsConnected(false); // Only set to false if both channels are truly down or on component unmount
      // setPresentUsers({}); // Resetting here might cause flicker if re-subscribing quickly
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
        console.error(
          'Chat not connected, roomName missing, currentUserProfile.id missing, or broadcast channel unavailable'
        );
        return;
      }

      const clientGeneratedId = crypto.randomUUID();
      const optimisticMessage: ChatMessage = {
        id: clientGeneratedId, // Use clientGeneratedId as temporary ID
        clientSideId: clientGeneratedId,
        content,
        created_at: new Date().toISOString(),
        profile: currentUserProfile,
        isOptimistic: true,
      };

      // 1. Local optimistic update
      setMessages((current) => [...current, optimisticMessage]);

      // 2. Broadcast optimistic message
      try {
        await broadcastChannel.send({
          type: 'broadcast',
          event: EVENT_OPTIMISTIC_MESSAGE_RECEIVED,
          payload: optimisticMessage, // Send the whole optimistic message
        });
      } catch (error) {
        console.error('Error broadcasting optimistic message:', error);
        // Potentially revert local update if broadcast fails critically, though usually we'd still try to save
      }

      // 3. Persist to server
      const formData = new FormData();
      formData.append('roomId', roomName);
      formData.append('content', content);
      formData.append('clientSideId', clientGeneratedId); // Send clientSideId to server

      try {
        const result = await sendMessageAction(undefined, formData);

        if (result.success && result.data && result.data.id && result.data.originalClientSideId) {
          // 4. Broadcast confirmation
          const persistedMessage = result.data as Required<Tables<'chat_messages'>> & {
            originalClientSideId: string;
          };

          await broadcastChannel.send({
            type: 'broadcast',
            event: EVENT_MESSAGE_CONFIRMED,
            payload: {
              clientSideId: persistedMessage.originalClientSideId,
              dbId: persistedMessage.id,
              dbCreatedAt: persistedMessage.created_at,
            },
          });
          // The local state for the sender will be updated by its own EVENT_MESSAGE_CONFIRMED listener.
        } else {
          console.error(
            'Failed to persist message or missing ID/originalClientSideId in response:',
            result.error || 'Unknown error'
          );
          // Revert optimistic update on failure to persist
          setMessages((currentMsgs) =>
            currentMsgs.filter((msg) => msg.clientSideId !== clientGeneratedId)
          );
          // Optionally notify the user
        }
      } catch (error) {
        console.error('Error calling sendMessage action:', error);
        // Revert optimistic update on action error
        setMessages((currentMsgs) =>
          currentMsgs.filter((msg) => msg.clientSideId !== clientGeneratedId)
        );
        // Optionally notify the user
      }
    },
    [broadcastChannel, isConnected, roomName, currentUserProfile, sendMessageAction] // Added sendMessageAction
  );

  const handleEditMessageSubmit = useCallback(
    async (messageId: number | string, newContent: string) => {
      // Ensure we have a broadcast channel and are connected.
      if (!broadcastChannel || !isConnected) {
        console.error('Cannot edit message: Broadcast channel not available or not connected.');
        return;
      }

      const messageToEdit = messages.find(
        (msg) => msg.id === messageId || msg.clientSideId === messageId
      );

      if (!messageToEdit) {
        console.warn(`Message with ID/clientSideId ${messageId} not found for edit.`);
        return;
      }

      if (messageToEdit.content === newContent) {
        console.log("Content hasn't changed, no edit action needed.");
        return;
      }

      const originalContent = messageToEdit.content;
      const targetClientSideId = messageToEdit.clientSideId;

      // 1. Local optimistic update
      setMessages((currentMsgs) =>
        currentMsgs.map((msg) =>
          msg.clientSideId === targetClientSideId
            ? { ...msg, content: newContent, isEditPending: true }
            : msg
        )
      );

      // 2. Broadcast optimistic edit
      try {
        await broadcastChannel.send({
          type: 'broadcast',
          event: EVENT_OPTIMISTIC_MESSAGE_EDITED,
          payload: { clientSideId: targetClientSideId, newContent },
        });
      } catch (error) {
        console.error('Error broadcasting optimistic edit:', error);
        // Optionally revert local optimistic update if broadcast fails, or rely on server action failure
      }

      // 3. Call server action (messageId must be the DB id for the action)
      // If messageToEdit.id is still the clientSideId (string), it means it was an optimistic new message that hasn't been confirmed.
      // Editing such a message is complex. For now, we assume edit is on a confirmed message (id is number).
      if (typeof messageToEdit.id !== 'number') {
        console.warn(
          'Attempting to edit a message that may not have a DB ID yet. Reverting optimistic edit.'
        );
        setMessages((currentMsgs) =>
          currentMsgs.map((msg) =>
            msg.clientSideId === targetClientSideId
              ? { ...msg, content: originalContent, isEditPending: false }
              : msg
          )
        );
        // Optionally broadcast a revert for other clients if the optimistic edit was sent
        // This scenario (editing an unconfirmed message) should ideally be prevented by UI logic.
        return;
      }

      try {
        const result = await editMessageAction(messageToEdit.id as number, newContent);
        if (result.success) {
          // 4. Broadcast edit confirmation
          await broadcastChannel.send({
            type: 'broadcast',
            event: EVENT_MESSAGE_EDIT_CONFIRMED,
            payload: {
              clientSideId: targetClientSideId,
              updatedContent: newContent /*, updatedAt: result.data?.updated_at */,
            },
          });
        } else {
          console.error('Failed to edit message on server:', result.error);
          // Revert local optimistic update and broadcast failure
          setMessages((currentMsgs) =>
            currentMsgs.map((msg) =>
              msg.clientSideId === targetClientSideId
                ? { ...msg, content: originalContent, isEditPending: false }
                : msg
            )
          );
          await broadcastChannel.send({
            type: 'broadcast',
            event: EVENT_MESSAGE_EDIT_FAILED,
            payload: { clientSideId: targetClientSideId, originalContent },
          });
        }
      } catch (error) {
        console.error('Error calling editMessage action:', error);
        setMessages((currentMsgs) =>
          currentMsgs.map((msg) =>
            msg.clientSideId === targetClientSideId
              ? { ...msg, content: originalContent, isEditPending: false }
              : msg
          )
        );
        await broadcastChannel.send({
          type: 'broadcast',
          event: EVENT_MESSAGE_EDIT_FAILED,
          payload: { clientSideId: targetClientSideId, originalContent },
        });
      }
    },
    [messages, broadcastChannel, isConnected, editMessageAction]
  );

  const handleDeleteMessageConfirm = useCallback(
    async (messageId: number | string) => {
      if (!broadcastChannel || !isConnected) {
        console.error('Cannot delete message: Broadcast channel not available or not connected.');
        return;
      }

      const messageToDelete = messages.find(
        (msg) => msg.id === messageId || msg.clientSideId === messageId
      );

      if (!messageToDelete) {
        console.warn(`Message with ID/clientSideId ${messageId} not found for delete.`);
        return;
      }

      const targetClientSideId = messageToDelete.clientSideId;
      const originalMessageCopy = { ...messageToDelete }; // Keep a copy for potential revert

      // 1. Local optimistic update
      setMessages((currentMsgs) =>
        currentMsgs.filter((msg) => msg.clientSideId !== targetClientSideId)
      );

      // 2. Broadcast optimistic delete
      try {
        await broadcastChannel.send({
          type: 'broadcast',
          event: EVENT_OPTIMISTIC_MESSAGE_DELETED,
          payload: { clientSideId: targetClientSideId },
        });
      } catch (error) {
        console.error('Error broadcasting optimistic delete:', error);
        // Potentially revert local optimistic update if broadcast fails critically
      }

      // 3. Call server action (messageId must be the DB id)
      if (typeof messageToDelete.id !== 'number') {
        console.warn(
          'Attempting to delete a message that may not have a DB ID yet. Reverting optimistic delete.'
        );
        setMessages((currentMsgs) =>
          [...currentMsgs, originalMessageCopy].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        );
        // No failure broadcast here as the optimistic delete might not have reached others or server call wasn't made.
        return;
      }

      try {
        const result = await deleteMessageAction(messageToDelete.id as number);
        if (result.success) {
          // 4. Broadcast delete confirmation
          await broadcastChannel.send({
            type: 'broadcast',
            event: EVENT_MESSAGE_DELETE_CONFIRMED,
            payload: { clientSideId: targetClientSideId },
          });
        } else {
          console.error('Failed to delete message on server:', result.error);
          // Revert local optimistic update and broadcast failure
          setMessages((currentMsgs) =>
            [...currentMsgs, originalMessageCopy].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          );
          await broadcastChannel.send({
            type: 'broadcast',
            event: EVENT_MESSAGE_DELETE_FAILED,
            payload: { originalMessage: originalMessageCopy },
          });
        }
      } catch (error) {
        console.error('Error calling deleteMessage action:', error);
        setMessages((currentMsgs) =>
          [...currentMsgs, originalMessageCopy].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        );
        await broadcastChannel.send({
          type: 'broadcast',
          event: EVENT_MESSAGE_DELETE_FAILED,
          payload: { originalMessage: originalMessageCopy },
        });
      }
    },
    [messages, broadcastChannel, isConnected, deleteMessageAction]
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
