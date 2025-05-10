import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUserName = () => {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfileName = async () => {
      try {
        const { data, error } = await createClient().auth.getUser();
        if (error) {
          // Only log if not AuthSessionMissingError
          if (error.name !== 'AuthSessionMissingError') {
            console.error(error);
          }
          // If AuthSessionMissingError, treat as logged out
          setName(null);
          return;
        }
        setName(data.user?.user_metadata.full_name ?? '?');
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          (err as { name: string }).name === 'AuthSessionMissingError'
        ) {
          setName(null);
        } else {
          console.error(err);
          setName('?');
        }
      }
    }
    fetchProfileName()
  }, [])

  return name || '?'
}
