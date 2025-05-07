'use server';

import { createClient } from '@/lib/supabase/server';
// import { cookies } from 'next/headers'; // createClient in server.ts handles this internally
import { z } from 'zod';
import type { Tables } from '@/types/database';

// Define the schema for input validation
const sendMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
});

// Schema for editing a message
const editMessageSchema = z.object({
  messageId: z.number().int().positive('Invalid message ID'),
  newContent: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
});

// Schema for deleting a message
const deleteMessageSchema = z.object({
  messageId: z.number().int().positive('Invalid message ID'),
});

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string | null;
  data?: Partial<Tables<'chat_messages'>> | null;
}

export async function sendMessage(
  prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  // 2. Validate input
  const rawInput = {
    roomId: formData.get('roomId') as string,
    content: formData.get('content') as string,
  };

  const validatedInput = sendMessageSchema.safeParse(rawInput);

  if (!validatedInput.success) {
    return {
      success: false,
      error: 'Invalid input: ' + validatedInput.error.errors.map((e) => e.message).join(', '),
    };
  }

  const { roomId, content } = validatedInput.data;

  // 3. Insert message into the database
  try {
    const { data: messageData, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        content: content,
      })
      .select('id, created_at, content, user_id, room_id')
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return { success: false, error: 'Failed to send message: ' + insertError.message };
    }

    // Optional: Revalidate path
    // revalidatePath(`/chat/${roomId}`) // Example

    return { success: true, message: 'Message sent', data: messageData };
  } catch (e: unknown) {
    let errorMessage = 'An unexpected error occurred';
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    console.error('Unexpected error in sendMessage action:', e);
    return { success: false, error: errorMessage };
  }
}

export async function editMessage(messageId: number, newContent: string): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  // 2. Validate input
  const validatedInput = editMessageSchema.safeParse({ messageId, newContent });

  if (!validatedInput.success) {
    return {
      success: false,
      error: 'Invalid input: ' + validatedInput.error.errors.map((e) => e.message).join(', '),
    };
  }

  const { messageId: validatedMessageId, newContent: validatedNewContent } = validatedInput.data;

  try {
    // 3. Verify ownership and update message
    const { data: existingMessage, error: fetchError } = await supabase
      .from('chat_messages')
      .select('id, user_id')
      .eq('id', validatedMessageId)
      .single();

    if (fetchError) {
      console.error('Error fetching message for edit:', fetchError);
      return { success: false, error: 'Message not found or error fetching it.' };
    }

    if (existingMessage.user_id !== user.id) {
      return { success: false, error: 'User not authorized to edit this message.' };
    }

    const { data: updatedMessageData, error: updateError } = await supabase
      .from('chat_messages')
      .update({ content: validatedNewContent }) // Consider adding updated_at if schema changes
      .eq('id', validatedMessageId)
      .select('id, created_at, content, user_id, room_id')
      .single();

    if (updateError) {
      console.error('Error updating message:', updateError);
      return { success: false, error: 'Failed to edit message: ' + updateError.message };
    }

    return { success: true, message: 'Message edited', data: updatedMessageData };
  } catch (e: unknown) {
    let errorMessage = 'An unexpected error occurred during edit';
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    console.error('Unexpected error in editMessage action:', e);
    return { success: false, error: errorMessage };
  }
}

export async function deleteMessage(messageId: number): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  // 2. Validate input
  const validatedInput = deleteMessageSchema.safeParse({ messageId });

  if (!validatedInput.success) {
    return {
      success: false,
      error: 'Invalid input: ' + validatedInput.error.errors.map((e) => e.message).join(', '),
    };
  }

  const { messageId: validatedMessageId } = validatedInput.data;

  try {
    // 3. Verify ownership
    const { data: existingMessage, error: fetchError } = await supabase
      .from('chat_messages')
      .select('id, user_id')
      .eq('id', validatedMessageId)
      .single();

    if (fetchError) {
      console.error('Error fetching message for delete:', fetchError);
      return { success: false, error: 'Message not found or error fetching it.' };
    }

    if (existingMessage.user_id !== user.id) {
      return { success: false, error: 'User not authorized to delete this message.' };
    }

    // 4. Delete message
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', validatedMessageId);

    if (deleteError) {
      console.error('Error deleting message:', deleteError);
      return { success: false, error: 'Failed to delete message: ' + deleteError.message };
    }

    return { success: true, message: 'Message deleted', data: { id: validatedMessageId } }; // Return the ID of the deleted message
  } catch (e: unknown) {
    let errorMessage = 'An unexpected error occurred during delete';
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    console.error('Unexpected error in deleteMessage action:', e);
    return { success: false, error: errorMessage };
  }
}
