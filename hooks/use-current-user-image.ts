import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null)


  console.log('image', image);

  useEffect(() => {
    const fetchUserImage = async () => {
      try {
        const { data, error } = await createClient().auth.getUser();
        console.log('data', data.user?.user_metadata);
        if (error) {
          if (error.name !== 'AuthSessionMissingError') {
            console.error(error);
          }
          setImage(null);
          return;
        }
        setImage(data.user?.user_metadata.avatar_url ?? null);
      } catch (err: unknown) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          (err as { name: string }).name === 'AuthSessionMissingError'
        ) {
          setImage(null);
        } else {
          console.error(err);
          setImage(null);
        }
      }
    };
    fetchUserImage();
  }, []);

  return image
}
