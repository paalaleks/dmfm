'use client';

import dynamic from 'next/dynamic';
import type { MessageSenderProfile, ChatMessage } from '@/hooks/use-realtime-chat';

interface RealtimeChatLoaderProps {
  roomName: string;
  currentUserProfile: MessageSenderProfile;
  initialMessages?: ChatMessage[];
  // Add any other props that RealtimeChat might need, if they are not already included in RealtimeChatProps
}

const RealtimeChat = dynamic(
  () => import('@/components/realtime-chat').then((mod) => mod.RealtimeChat),
  {
    ssr: false,
    // Optional: add a loading component here if needed
    // loading: () => <p>Loading chat...</p>,
  }
);

export default function RealtimeChatLoader(props: RealtimeChatLoaderProps) {
  return <RealtimeChat {...props} />;
}
