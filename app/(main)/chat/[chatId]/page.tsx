import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RealtimeChat } from '@/components/realtime-chat';
// import type { Tables } from '@/types/database'; // Removed unused import
import type { MessageSenderProfile } from '@/hooks/use-realtime-chat';
// import { RealtimeAvatarStack } from '@/components/realtime-avatar-stack'; // Already removed

interface ChatRoomPagePromise {
  params: Promise<{
    chatId: string; // This will be the UUID of the chat room from the URL
  }>;
}

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

  // Fetch the user's full profile (id, username, avatar_url)
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

  // The currentUserProfileData is now guaranteed to be MessageSenderProfile compatible
  const currentUserProfile = currentUserProfileData;
  // At this point, currentUserProfile.username is guaranteed to be a non-null, non-empty string.
  // We can assert it for TypeScript if direct usage as prop causes issues, or rely on the component prop type.

  // Fetch initial messages for the room - THIS LOGIC WILL BE MOVED TO THE CLIENT
  // let initialMessages: ChatMessage[] = [];
  //
  // const { data: initialMessagesData, error: messagesError } = await supabase
  //   .from('chat_messages')
  //   .select(
  //     `
  //     id,
  //     content,
  //     created_at,
  //     user_id,
  //     room_id,
  //     profile:profiles (
  //       id,
  //       username,
  //       avatar_url
  //     )
  //   `
  //   )
  //   .eq('room_id', chatId)
  //   .order('created_at', { ascending: true })
  //   .limit(50);
  //
  // if (messagesError) {
  //   console.error(`Error fetching initial messages for room ${chatId}:`, messagesError);
  // } else if (initialMessagesData) {
  //   initialMessages = initialMessagesData
  //     .map((msg) => {
  //       let userProfile: MessageSenderProfile | null = null;
  //       if (msg.profile) {
  //         if (Array.isArray(msg.profile)) {
  //           userProfile = msg.profile.length > 0 ? (msg.profile[0] as MessageSenderProfile) : null;
  //         } else {
  //           userProfile = msg.profile as MessageSenderProfile;
  //         }
  //       }
  //
  //       if (!msg.created_at) {
  //         console.warn(
  //           'Message found with null created_at, using current time as fallback:',
  //           msg.id
  //         );
  //       }
  //
  //       return {
  //         id: msg.id as number | string,
  //         content: msg.content as string,
  //         created_at: msg.created_at || new Date().toISOString(),
  //         profile: userProfile,
  //       };
  //     })
  //     .filter(Boolean) as ChatMessage[];
  // }

  // Optional: Validate if the chatId exists as a room or if user has access
  // For MVP, we might assume valid chatId if the user navigates here.
  // Example check:
  // const { data: roomExists, error: roomError } = await supabase
  //   .from('chat_rooms')
  //   .select('id')
  //   .eq('id', chatId)
  //   .maybeSingle()
  // if (roomError || !roomExists) {
  //   console.error(`Chat room with ID ${chatId} not found or error:`, roomError);
  //   // redirect('/chat?error=room_not_found'); // Or to a 404 page
  //   return <div>Room not found</div>;
  // }

  // TODO: Fetch initial messages for the room using `chatId`.
  // This is part of TSC-5.
  // For now, RealtimeChat will start with an empty list passed via props or its own internal state.

  return (
    <div className='h-screen flex flex-col'>
      <RealtimeChat
        roomName={chatId}
        currentUserProfile={currentUserProfile}
        initialMessages={[]} // Pass empty array, client will fetch
      />
    </div>
  );
}
