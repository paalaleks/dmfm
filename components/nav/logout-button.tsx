'use client';

import { Button } from '@/components/ui/button';
import { signOutAction } from './logout-action';

export function LogoutButton() {
  return (
    <form className='w-full' action={signOutAction}>
      <Button type='submit' className='w-full' variant={'ghost'}>
        Sign out
      </Button>
    </form>
  );
}
