import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { MessageSenderProfile, ChatMessage } from '@/hooks/use-realtime-chat';
// import dynamic from 'next/dynamic'; // Removed
import RealtimeChatLoader from '@/components/realtime-chat-loader'; // Added

interface ChatRoomPagePromise {
  params: Promise<{
    chatId: string; // This will be the UUID of the chat room from the URL
  }>;
}

// const RealtimeChat = dynamic( // Removed
// () => import('@/components/realtime-chat').then((mod) => mod.RealtimeChat), // Removed
// { ssr: false } // Removed
// ); // Removed

export default async function ChatRoomPage({ params }: ChatRoomPagePromise) {
  const { chatId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Error fetching user or user not authenticated:', userError);
    redirect('/login');
  }

  const userId = user.id;

  const { data: currentUserProfileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url') // Fetch id, username, and avatar_url
    .eq('id', userId)
    .single<MessageSenderProfile>(); // Cast to MessageSenderProfile

  if (profileError || !currentUserProfileData) {
    console.error(`Error fetching full profile for user ${userId}:`, profileError);
    redirect('/login?error=profile_fetch_failed');
  }

  // Explicitly check if username is null or empty after successful profile fetch
  if (!currentUserProfileData.username) {
    console.error(`Username is missing for user ${userId}:`);
    redirect('/login?error=username_missing');
  }

  const currentUserProfile = currentUserProfileData;

  let initialMessages: ChatMessage[] = [];

  const { data: initialMessagesData, error: messagesError } = await supabase
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
    .limit(50);

  if (messagesError) {
    console.error(`Error fetching initial messages for room ${chatId}:`, messagesError);
  } else if (initialMessagesData) {
    initialMessages = initialMessagesData
      .map((msg) => {
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
    <RealtimeChatLoader // Changed
      roomName={chatId}
      currentUserProfile={currentUserProfile}
      initialMessages={initialMessages}
    />
  );
}
