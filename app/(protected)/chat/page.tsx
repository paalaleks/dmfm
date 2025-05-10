import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper function to get the default chat room ID
async function getDefaultChatRoomId(supabase: SupabaseClient): Promise<string | null> {
  const { data: room, error } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('is_default_room', true) // Changed to use the boolean flag
    .maybeSingle();

  if (error) {
    console.error('Error fetching default chat room:', error);
    return null;
  }
  return room?.id || null;
}

export default async function ChatRedirectPage() {
  const supabase = await createClient();

  // Optional: Check if user is authenticated before redirecting.
  // If unauthenticated, could redirect to login first, or let the target [chatId] page handle it.
  // For simplicity here, we'll assume the [chatId] page handles auth checks robustly.

  const defaultRoomId = await getDefaultChatRoomId(supabase);

  if (defaultRoomId) {
    redirect(`/chat/${defaultRoomId}`);
  } else {
    // Fallback if default room ID isn't found (shouldn't happen with correct seeding)
    // Could redirect to a general error page or a page to create rooms, etc.
    // For now, a simple message or redirect to home.
    console.error('Default chat room not found. Cannot redirect.');
    // Or redirect to a generic error page or home
    // redirect('/?error=default_room_missing');
    return (
      <div className='flex flex-col items-center justify-center h-screen'>
        <h1 className='text-2xl font-semibold mb-4'>Default Chat Room Not Found</h1>
        <p>The system could not find the default chat room. Please contact support.</p>
      </div>
    );
  }
  // This return is technically unreachable if redirect occurs or an error component is returned,
  // but linters/compilers might appreciate a clear path.
  return null;
}
