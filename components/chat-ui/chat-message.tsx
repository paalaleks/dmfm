import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/hooks/use-realtime-chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showHeader: boolean;
}

// Helper to get initials for fallback
const getInitials = (name: string) => {
  const names = name.split(' ');
  const initials = names.map((n) => n[0]).join('');
  return initials.toUpperCase().slice(0, 2);
};

export const ChatMessageItem = ({ message, isOwnMessage, showHeader }: ChatMessageItemProps) => {
  return (
    <div
      className={cn(
        'flex items-start mt-2',
        isOwnMessage ? 'justify-end' : 'justify-start',
        showHeader ? 'mt-2' : 'mt-1'
      )}
    >
      {!isOwnMessage && (
        <Avatar className='size-8 mr-2 flex-shrink-0'>
          <AvatarImage
            className='object-cover'
            src={message.user.avatarUrl || undefined}
            alt={`${message.user.name}'s avatar`}
          />
          <AvatarFallback>{getInitials(message.user.name)}</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn('max-w-[75%] w-fit flex flex-col gap-0.5', {
          'items-end': isOwnMessage,
          'items-start': !isOwnMessage,
        })}
      >
        {showHeader && (
          <div
            className={cn('flex items-center gap-2 text-xs px-0', {
              'justify-end flex-row-reverse': isOwnMessage,
            })}
          >
            <span className={'font-medium'}>{message.user.name}</span>
            <span className='text-foreground/50 text-xs'>
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        )}
        <div
          className={cn(
            'py-2 px-3 rounded-xl text-sm w-fit shadow-sm',
            isOwnMessage
              ? 'bg-primary text-primary-foreground rounded-br-none'
              : 'bg-muted text-foreground rounded-bl-none'
          )}
        >
          {message.content}
        </div>
      </div>

      {/* Avatar for own messages, shown on the right */}
      {isOwnMessage && (
        <Avatar className='size-8 ml-2 flex-shrink-0'>
          <AvatarImage
            className='object-cover'
            src={message.user.avatarUrl || undefined}
            alt={`${message.user.name}'s avatar`}
          />
          <AvatarFallback>{getInitials(message.user.name)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
