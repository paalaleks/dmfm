import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { RealtimeChat } from '@/components/chat-ui/realtime-chat';
import { notFound } from 'next/navigation';
import type { Tables } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage as RealtimeChatMessage } from '@/hooks/use-realtime-chat';

type ChatMessageRow = Tables<'chat_messages'>;
type ProfileRow = Tables<'profiles'>;
type ChatRoomRow = Tables<'chat_rooms'>;

type DbChatMessageWithProfile = ChatMessageRow & {
  profile: Pick<ProfileRow, 'username' | 'avatar_url'> | null;
};

interface ChatPageProps {
  params: {
    chatId: string;
  };
}

async function getChatRoomDetails(
  supabase: SupabaseClient,
  roomId: string
): Promise<ChatRoomRow | null> {
  const { data: room, error } = await supabase
    .from('chat_rooms')
    .select('id, name, description, created_at, is_default_room')
    .eq('id', roomId)
    .single();

  if (error) {
    console.error('Error fetching chat room details:', error);
    return null;
  }
  return room;
}

async function getInitialMessages(
  supabase: SupabaseClient,
  roomId: string
): Promise<RealtimeChatMessage[]> {
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select(
      `
      id,
      content,
      created_at,
      user_id,
      room_id,
      profile:profiles (
        username,
        avatar_url
      )
    `
    )
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(50);

  console.log('[ChatPage] Raw messages from Supabase:', JSON.stringify(messages, null, 2));

  if (error) {
    console.error('Error fetching initial messages:', error);
    return [];
  }

  // More assertive cast, trusting runtime logs that profile is an object
  const dbMessages = (messages || []) as unknown as DbChatMessageWithProfile[];

  return dbMessages.map((msg) => {
    const userProfile = msg.profile;
    console.log(
      `[ChatPage] Mapping message for user_id=${msg.user_id}, raw_profile_object=${JSON.stringify(msg.profile)}, derived_userProfile=${JSON.stringify(userProfile)}`
    );
    return {
      id: msg.id.toString(),
      content: msg.content,
      createdAt: msg.created_at || new Date().toISOString(),
      user: {
        name: userProfile?.username || 'Unknown User',
        avatarUrl: userProfile?.avatar_url || null,
      },
    };
  });
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = params;
  const supabase: SupabaseClient = await createSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Auth error or no user:', authError);
    return <div>User authentication failed. Please try logging in again.</div>;
  }

  const { data: userProfileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, updated_at, spotify_user_id')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfileData) {
    console.error('Error fetching user profile:', profileError);
    return <div>Error loading user profile. Ensure your profile is set up.</div>;
  }
  const currentUserProfile: ProfileRow = userProfileData;

  console.log(
    '[ChatPage] Current user profile from Supabase:',
    JSON.stringify(userProfileData, null, 2)
  );

  const chatRoom = await getChatRoomDetails(supabase, chatId);
  if (!chatRoom) {
    console.warn(`Chat room with ID ${chatId} not found.`);
    notFound();
  }

  const initialMessages = await getInitialMessages(supabase, chatId);

  return (
    <RealtimeChat
      roomName={chatId}
      username={currentUserProfile.username || 'Anonymous'}
      messages={initialMessages}
      userAvatarUrl={currentUserProfile.avatar_url || null}
    />
  );
}
