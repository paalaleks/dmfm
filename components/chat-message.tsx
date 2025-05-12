'use client';

import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/hooks/use-realtime-chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
// import { Textarea } from "@/components/ui/textarea"; // Explicitly commenting out/removing
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showHeader: boolean;
  onEditSubmit: (messageId: number | string, newContent: string) => Promise<void>;
  onDeleteConfirm: (messageId: number | string) => Promise<void>;
}

export const ChatMessageItem = ({
  message,
  isOwnMessage,
  showHeader,
  onEditSubmit,
  onDeleteConfirm,
}: ChatMessageItemProps) => {
  const [showControls, setShowControls] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  let longPressTimeout: NodeJS.Timeout | null = null;

  // Determine if the message is still in its optimistic state (using client-side string ID)
  const isPendingSend = typeof message.id === 'string';

  useEffect(() => {
    if (!isEditing) {
      setEditText(message.content);
    }
  }, [message.content, isEditing]);

  const handleMouseEnter = () => {
    if (isOwnMessage && !isEditing) {
      setShowControls(true);
    }
  };

  const handleMouseLeave = () => {
    setShowControls(false);
  };

  const handleTouchStart = () => {
    if (isOwnMessage && !isEditing) {
      longPressTimeout = setTimeout(() => {
        setShowControls(true);
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      longPressTimeout = null;
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditText(message.content);
    setShowControls(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(message.content);
  };

  const handleSaveEdit = () => {
    if (editText.trim() === '' || editText === message.content) {
      setIsEditing(false);
      setEditText(message.content);
      return;
    }
    onEditSubmit(message.id, editText.trim());
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setShowControls(false);
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    await onDeleteConfirm(message.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className={`flex mt-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={cn('max-w-[75%] w-fit flex flex-col gap-1 relative py-1', {
          'items-end': isOwnMessage,
          'pl-14': isOwnMessage,
        })}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {showHeader && !isEditing && (
          <div
            className={cn('flex items-center gap-2 text-xs px-2 py-1', {
              'justify-end flex-row-reverse': isOwnMessage,
            })}
          >
            <Avatar className='h-6 w-6'>
              <AvatarImage
                src={message.profile?.avatar_url || undefined}
                alt={message.profile?.username || 'U'}
              />
              <AvatarFallback className='text-xs'>
                {message.profile?.username
                  ?.split(' ')
                  ?.map((word) => word[0])
                  ?.join('')
                  ?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className={'font-medium'}>{message.profile?.username || 'User'}</span>
            <span className='text-foreground/50 text-xs'>
              {new Date(message.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        )}

        <div className='relative'>
          {isEditing ? (
            <div className='w-full flex flex-col gap-1 py-1 px-1'>
              <textarea
                value={editText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditText(e.target.value)
                }
                className='text-sm resize-none border rounded-md p-2 border-primary focus:ring-primary focus:border-primary bg-background text-foreground'
                rows={Math.max(1, Math.min(5, editText.split('\n').length))}
                autoFocus
              />
              <div className='flex justify-end gap-1 mt-1'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 p-1'
                  onClick={handleCancelEdit}
                  aria-label='Cancel edit'
                >
                  <X className='h-4 w-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 p-1 text-green-600 hover:text-green-600 hover:bg-green-600/10'
                  onClick={handleSaveEdit}
                  aria-label='Save edit'
                >
                  <Check className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'py-2 px-3 rounded-xl text-sm w-fit transition-opacity bg-chat-bg1',
                isOwnMessage ? 'bg-chat-bg2 ' : 'bg-muted text-foreground',
                isOwnMessage && (isPendingSend || message.isEditPending) && 'opacity-70'
              )}
            >
              {message.content}
            </div>
          )}

          {isOwnMessage && showControls && !isEditing && !showDeleteConfirm && (
            <div
              className={cn('absolute top-1 flex gap-1', isOwnMessage ? '-left-14' : '-right-14')}
            >
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6 p-1'
                onClick={handleEditClick}
                aria-label='Edit message'
              >
                <Edit2 className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6 p-1 text-destructive hover:text-destructive hover:bg-destructive/10'
                onClick={handleDeleteClick}
                aria-label='Delete message'
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>
          )}

          {isOwnMessage && showDeleteConfirm && (
            <div
              className={cn(
                'absolute -top-2 flex flex-col items-end gap-1 p-2 rounded-md shadow-md bg-background border border-border',
                isOwnMessage ? 'left-[-150px] w-[140px]' : 'right-[-150px] w-[140px]'
              )}
            >
              <p className='text-xs text-foreground/80 text-center w-full'>Delete message?</p>
              <div className='flex gap-1 w-full justify-end'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleCancelDelete}
                  className='h-7 px-2 text-xs'
                >
                  <X className='h-3 w-3 mr-1' /> Cancel
                </Button>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={handleConfirmDelete}
                  className='h-7 px-2 text-xs'
                >
                  <Check className='h-3 w-3 mr-1' /> Confirm
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
