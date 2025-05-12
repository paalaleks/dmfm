-- supabase/migrations/YYYYMMDDHHMMSS_create_notification_rpcs.sql

BEGIN;

-- RPC Function: get_user_notifications
CREATE OR REPLACE FUNCTION public.get_user_notifications(
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0,
    p_include_read BOOLEAN DEFAULT FALSE
)
RETURNS SETOF public.user_notifications -- Or define a specific return type/view if preferred
LANGUAGE plpgsql
SECURITY DEFINER -- Executes with the permissions of the function owner (superuser if created by one)
AS $$
BEGIN
    -- Make sure to set search_path if not relying on default or function owner's path
    -- SET search_path = public;

    RETURN QUERY
    SELECT *
    FROM public.user_notifications
    WHERE user_id = auth.uid()
      AND (p_include_read OR NOT is_read) -- if p_include_read is true, get all; otherwise, only unread
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- RPC Function: mark_notification_as_read
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id BIGINT)
RETURNS public.user_notifications -- Return the updated notification
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_notification public.user_notifications;
BEGIN
    UPDATE public.user_notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = p_notification_id AND user_id = auth.uid()
    RETURNING * INTO updated_notification;

    RETURN updated_notification;
END;
$$;

-- RPC Function: mark_all_notifications_as_read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS SETOF public.user_notifications -- Return all notifications that were marked as read
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.user_notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = auth.uid() AND is_read = FALSE
    RETURNING *;
END;
$$;

-- RPC Function: get_unread_notification_count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS JSONB -- Return as JSON object { "count": number }
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unread_count INT;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM public.user_notifications
    WHERE user_id = auth.uid() AND is_read = FALSE;

    RETURN jsonb_build_object('count', unread_count);
END;
$$;

-- Grant execute permissions to the authenticated role for these functions
-- This is crucial for them to be callable from the client-side via Supabase SDK
GRANT EXECUTE ON FUNCTION public.get_user_notifications(INT, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;


COMMIT; 