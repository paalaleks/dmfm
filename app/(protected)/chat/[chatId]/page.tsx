import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { MessageSenderProfile, ChatMessage } from '@/hooks/use-realtime-chat';
// import RealtimeChatLoader from '@/components/realtime-chat-loader'; // Added
import { RealtimeChat } from '@/components/realtime-chat';
import { Suspense } from 'react';

interface RawChatMessageFromDB {
  id: string | number;
  content: string;
  created_at: string;
  user_id: string;
  room_id: string;
  profile: MessageSenderProfile | MessageSenderProfile[] | null;
}

interface ChatRoomPagePromise {
  params: Promise<{
    chatId: string; // This will be the UUID of the chat room from the URL
  }>;
}

export default async function ChatRoomPage({ params }: ChatRoomPagePromise) {
  const { chatId } = await params;
  const supabase = await createClient();

  // Fetch user and initial messages in parallel
  const [userAuthResult, initialMessagesResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
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
      .eq('room_id', chatId)
      .order('created_at', { ascending: true })
      .limit(50),
  ]);

  const {
    data: { user },
    error: userError,
  } = userAuthResult;

  if (userError || !user) {
    console.error('Error fetching user or user not authenticated:', userError);
    redirect('/login');
    return; // Stop further execution
  }

  const userId = user.id;

  // Fetch current user's profile (depends on userId)
  const { data: currentUserProfileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url') // Fetch id, username, and avatar_url
    .eq('id', userId)
    .single<MessageSenderProfile>(); // Cast to MessageSenderProfile

  if (profileError || !currentUserProfileData) {
    console.error(`Error fetching full profile for user ${userId}:`, profileError);
    redirect('/login?error=profile_fetch_failed');
    return; // Stop further execution
  }

  // Explicitly check if username is null or empty after successful profile fetch
  if (!currentUserProfileData.username) {
    console.error(`Username is missing for user ${userId}:`);
    redirect('/login?error=username_missing');
    return; // Stop further execution
  }

  const currentUserProfile = currentUserProfileData;

  // Process initial messages
  let initialMessages: ChatMessage[] = [];
  const { data: initialMessagesData, error: messagesError } = initialMessagesResult;

  if (messagesError) {
    console.error(`Error fetching initial messages for room ${chatId}:`, messagesError);
  } else if (initialMessagesData) {
    initialMessages = initialMessagesData
      .map((msg: RawChatMessageFromDB) => {
        let userProfile: MessageSenderProfile | null = null;
        if (msg.profile) {
          if (Array.isArray(msg.profile)) {
            userProfile = msg.profile.length > 0 ? (msg.profile[0] as MessageSenderProfile) : null;
          } else {
            userProfile = msg.profile as MessageSenderProfile;
          }
        }

        if (!msg.created_at) {
          console.warn(
            'Message found with null created_at, using current time as fallback:',
            msg.id
          );
        }

        return {
          id: msg.id as number | string,
          clientSideId: msg.id.toString(),
          content: msg.content as string,
          created_at: msg.created_at || new Date().toISOString(),
          profile: userProfile,
          isOptimistic: false,
        };
      })
      .filter(Boolean) as ChatMessage[];
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RealtimeChat // Changed
        roomName={chatId}
        currentUserProfile={currentUserProfile}
        initialMessages={initialMessages}
      />
    </Suspense>
  );
}
